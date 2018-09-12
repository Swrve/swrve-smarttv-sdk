import {IQueryParams} from "./IQueryParams";
import {ProfileManager} from "../Profile/ProfileManager";
import SwrveLogger from "../utils/SwrveLogger";
import {ISwrveInternalConfig} from "../Config/ISwrveInternalConfig";
import IResourceDiff from "../WebApi/Resources/IResourceDiff";
import IRestResponse from "./IRestResponse";
import {IPlatform} from "../utils/platforms/IPlatform";
import IEventBatch from "../WebApi/Events/IEventBatch";
import SwrveEvent from "../WebApi/Events/SwrveEvent";
import IIdentityParams from "../WebApi/Identity/IIdentityParams";
import IdentityResponse from "../WebApi/Identity/IIdentityResponse";

export class SwrveRestClient {
    public readonly version: number = 3;
    public readonly apiVersion: string = "7";

    public constructor(private readonly config: ISwrveInternalConfig,
                       private readonly profileManager: ProfileManager,
                       private readonly platform: IPlatform) {
    }

    public postEvents(events: ReadonlyArray<SwrveEvent>): Promise<Response | Error | void> {
        const appId = this.config.appId;
        const stack = this.config.stack ===  "us" ? "api" : "eu-api";
        const url = this.config.contentUrl == null
            ? `https://${appId}.${stack}.swrve.com/1/batch`
            : this.config.contentUrl;

        const body: IEventBatch = {
            user: this.profileManager.currentUser.userId,
            app_version: this.config.appVersion,
            session_token: this.profileManager.getSessionToken(),
            version: this.version,
            unique_device_id: this.platform.deviceID,
            data: events,
        };

        return this.fetch(url,
        {
            body: JSON.stringify(body),
            cache: 'no-cache',
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
        });
    }

    public getCampaignsAndResources(): Promise<any> {
        const appId = this.config.appId;
        const stack = this.config.stack === "us" ? "content" : "eu-content";
        const url = this.config.apiUrl == null
            ? `https://${appId}.${stack}.swrve.com/api/1/user_resources_and_campaigns?`
            : this.config.apiUrl;
        const query = this.getQueryString(this.profileManager.currentUser.etag);

        return this.fetch(url + query)
            .then(response => response.json()
                .then((json) => ({
                    json,
                    etag: response.headers.get("ETag"),
                })))
            .catch(error => {
                throw error;
            });
    }

    public identify(thirdPartyLoginId: string, swrveId: string): Promise<IdentityResponse> {
        const appId = this.config.appId;
        const url = this.config.identityUrl == null
            ? `https://${appId}.identity.swrve.com/identify`
            : this.config.identityUrl;
        const body: IIdentityParams = {
            api_key: this.config.apiKey,
            swrve_id: swrveId,
            external_user_id: thirdPartyLoginId,
            unique_device_id: this.platform.deviceID,
        };

        return this.fetch(url,
            {
                body: JSON.stringify(body),
                cache: "no-cache",
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(response => {
                if (response && response.ok) {
                    return response.json();
                } else {
                    throw new Error("Error " + response + " statusText:" + (response && response.statusText));
                }
            })
            .catch(error => {
                SwrveLogger.debug(error);
                throw error;
            });
    }

    public getUserResourcesDiff(): Promise<IRestResponse<ReadonlyArray<IResourceDiff>>> {
        const appId = this.config.appId;
        const stack = this.config.stack === "us" ? "content" : "eu-content";
        const url = this.config.apiUrl == null
            ? `https://${appId}.${stack}.swrve.com/api/1/user_resources_diff?`
            : this.config.apiUrl;
        const query = this.getQueryString();

        SwrveLogger.info("url+query " + url + query);

        return this.fetch(url + query)
            .then(response =>
                response.json()
                    .then((json: ReadonlyArray<IResourceDiff>) => ({
                        json,
                        etag: response.headers.get("ETag"),
                    })));
    }

    public getQueryString(etag?: string): string {
        const esc = encodeURIComponent;
        const params: IQueryParams = this.getContentRequestParams();

        const query = Object.keys(params)
            .filter(key => (<any>params)[key] != null)
            .map(k => esc(k) + '=' + esc((<any>params)[k]))
            .join('&');

        const etagParam = etag ? "&etag=" + etag : "";
        return query + etagParam + "&session_token=" + this.profileManager!.getSessionToken();
    }

    public getContentRequestParams(): IQueryParams {
        const params: IQueryParams = {
            api_key: this.config.apiKey,
            user: this.profileManager.currentUser.userId,
            app_version: this.config.appVersion,
            joined: this.profileManager.currentUser.firstUse.toString(),
            version: this.apiVersion,
            language: this.platform.language,
            app_store: this.platform.appStore,
            device_width: this.platform.screenWidth.toString(),
            device_height: this.platform.screenHeight.toString(),
            device_dpi: this.platform.screenDPI.toString(),
            device_name: this.platform.deviceID,
            os_version: this.platform.osVersion,
            orientation: 'landscape',
        };

        return params;
    }

    public fetch(input: string | Request, init?: RequestInit): Promise<Response> {
        const timeout = this.config.httpsTimeoutSeconds;
        let controller: AbortController;
        let signal;
        if ("AbortController" in window) {
            controller = new AbortController();
            signal = controller.signal;
        }

        return Promise.race([
            fetch(input, { ...init, signal }),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Request timeout after ' + timeout + ' seconds'));
                    if (controller) {
                        controller.abort();
                    }
                }, timeout * 1000);
            }) as Promise<Response>,
        ]);
    }
}
