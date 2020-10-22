import BasePlatform from "./base";
import { IKeyMapping } from "./IKeymapping";
import {
    DevicePropertyName,
    IPlatformName,
    NetworkMonitorHandle,
    NETWORK_DISCONNECTED,
    NETWORK_CONNECTED,
} from "./IPlatform";
import SwrveLogger from "../SwrveLogger";

const webOSMapping = {
    36: "Return",
    38: "Up",
    40: "Down",
    37: "Left",
    39: "Right",
    13: "Enter",
    8: "Return",
    413: "Stop",
    417: "FastForward",
    412: "Rewind",
    415: "Play",
    19: "Pause",
    461: "Back",
};

export default class WebOSPlatform extends BasePlatform {
    public name(): IPlatformName {
        return {
            name: "LG",
            variation: "webOS",
        };
    }

    public init(deviceProperties: ReadonlyArray<DevicePropertyName> = []): Promise<void> {
        super.init(deviceProperties);
        return deviceProperties.reduce(
            (promise, property) => promise.then(() => this.getDeviceProperty(property)),
            Promise.resolve(),
        );
    }

    public getKeymapping(): IKeyMapping {
        return webOSMapping;
    }

    public get timezone(): string {
        if (this._timezone === undefined) {
            this.setTimezoneAndCountry();
        }
        return this._timezone || "";
    }

    public get countryCode(): string {
        if (this._countryCode === undefined) {
            this.setTimezoneAndCountry();
        }
        return this._countryCode || "";
    }

    public get appStore(): string {
        return "lgappstv";
    }

    public get os(): string {
        return "webos";
    }

    public get model(): string {
        return this._model || "";
    }

    public get firmware(): string {
        return this._firmware || "";
    }

    public exit(): void {
        webOS.platformBack();
    }

    public get osVersion(): string {
        if (this._osVersion === undefined) {
            try {
                const info = JSON.parse(PalmSystem.deviceInfo);
                this._osVersion = info.platformVersion;
            } catch (e) {
                this._osVersion = "";
            }
        }
        return this._osVersion || "";
    }

    public getTimezone(): Promise<string> {
        if (this._timezone === undefined) {
            return new Promise((resolve, reject) =>
                webOS.service.request("luna://com.palm.systemservice", {
                    method: "time/getSystemTime",
                    onSuccess: (response: webOS.SystemTimeInfo) => {
                        resolve((this._timezone = response.timezone));
                    },
                    onFailure: reject,
                }),
            );
        }
        return Promise.resolve(this._timezone || "");
    }

    public getFirmware(): Promise<string> {
        if (this._firmware === undefined) {
            return this.loadSystemInfo().then(() => this._firmware || "");
        }
        return Promise.resolve(this._firmware || "");
    }

    public openLink(link: string): void {
        webOSDev.launch({
            id: webOSDev.APP.BROWSER,
            params: {
                target: link,
            },
            onSuccess: () => {
                SwrveLogger.info("launch application control succeed");
            },
            onFailure: (e) => {
                SwrveLogger.error("launch application control failed. reason: ", e);
            },
        });
    }

    protected initNetworkListener(): NetworkMonitorHandle {
        return webOSDev.connection.getStatus({
            onSuccess: (res) => {
                if (res.isInternetConnectionAvailable === false) {
                    this.triggerNetworkChange(NETWORK_DISCONNECTED);
                } else {
                    this.triggerNetworkChange(NETWORK_CONNECTED);
                }
            },
            onFailure: (err) => {
                SwrveLogger.error("Failed to get network state", err.errorCode, err.errorText);
            },
            subscribe: true,
        });
    }

    protected removeNetworkListener(handle: webOSDev.WebOSSubscriptionHandle): void {
        handle.cancel();
    }

    private setTimezoneAndCountry(): void {
        const systemInfo = webOS.systemInfo();
        if (this._timezone === undefined) {
            this._timezone = systemInfo.timezone;
        }
        this._countryCode = systemInfo.country;
    }

    private getDeviceProperty(property: DevicePropertyName): Promise<any> | undefined {
        switch (property) {
            case "timezone":
                return this.getTimezone();
            case "firmware":
                return this.getFirmware();
            default:
                return undefined;
        }
    }

    private loadSystemInfo(): Promise<void> {
        return new Promise((resolve, reject) =>
            webOS.service.request("luna://com.webos.service.tv.systemproperty", {
                method: "getSystemInfo",
                parameters: {
                    keys: [ "modelName", "firmwareVersion" ],
                },
                onSuccess: (response: webOS.SystemProperties) => {
                    this._model = response.modelName;
                    this._firmware = response.firmwareVersion;
                    resolve();
                },
                onFailure: reject,
            }),
        );
    }
}
