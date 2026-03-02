import {EventFactory} from "./Events/EventFactory";
import {ProfileManager} from "./Profile/ProfileManager";
import PAL from "./utils/PAL";
import {CampaignManager} from "./Campaigns/CampaignManager";
import {ISwrveButton,
    ISwrveCampaign,
    ISwrveCampaignResourceResponse,
    ISwrveEmbeddedMessage,
    IUserResource } from "./Campaigns/ISwrveCampaign";
import {ResourceManagerInternal} from "./Resources/ResourceManagerInternal";
import {ResourceManager} from "./Resources/ResourceManager";
import {SwrveResource} from "./Resources/SwrveResource";
import {
    GetResourcesCallback,
    GetUserResourcesDiffCallback,
    OnCampaignLoadedCallback,
    OnCustomButtonClicked,
    OnIAMDismissed,
    OnIAMShown,
    OnIdentifySuccessCallback,
    OnIdentifyErrorCallback,
    OnMessageListener,
    OnResourcesLoadedCallback,
} from "./SwrveSDK";
import * as SwrveConstants from "./utils/SwrveConstants";
import {StorageManager} from "./Storage/StorageManager";
import {IUserInfo} from "./Profile/IUser";
import {ISwrveInternalConfig, validateConfig} from "./Config/ISwrveInternalConfig";
import SwrveLogger from "./utils/SwrveLogger";
import {EventManager} from "./Events/EventManager";
import {SwrveRestClient} from "./RestClient/SwrveRestClient";
import ISwrveConfig, {configWithDefaults} from "./Config/ISwrveConfig";
import {queryDeviceProperties} from "./utils/DeviceProperties";
import IResourceDiff from "./WebApi/Resources/IResourceDiff";
import IDictionary from "./utils/IDictionary";
import IRestResponse from "./RestClient/IRestResponse";
import IReadonlyDictionary from "./utils/IReadonlyDictionary";
import IReward from "./WebApi/Events/IReward";
import SwrveEvent from "./WebApi/Events/SwrveEvent";
import DateHelper from "./utils/DateHelper";
import { getInstallDateFormat } from "./utils/TimeHelper";
import {CAMPAIGN_STATE, SWRVE_PAYLOAD_DEVICE_TYPE_TV, SwrveTrackingState, SwrveTrackingStates} from "./utils/SwrveConstants";
import { TextTemplating } from "./utils/TextTemplating";
import { RealTimeUserPropertiesManager } from "./UserProperties/RealTimeUserPropertiesManager";
import { combineDictionaries } from "./utils/DictionaryHelper";
import { generateUuid } from "./utils/uuid";
import { ICampaignState } from "./Campaigns/ICampaignState";
import { IPlatform } from "./utils/platforms/IPlatform";
export class SwrveInternal {
    public readonly profileManager: ProfileManager;

    private readonly config: ISwrveInternalConfig;
    private readonly evtManager: EventManager;
    private readonly eventFactory: EventFactory;
    private readonly restClient: SwrveRestClient;
    private readonly campaignManager: CampaignManager;
    private readonly resourceManager: ResourceManagerInternal;
    private readonly platform: IPlatform;
    private readonly realTimeUserPropertiesManager: RealTimeUserPropertiesManager;
    
    private onResourcesLoadedCallback: OnResourcesLoadedCallback | null = null;
    private onCampaignLoadedCallback: OnCampaignLoadedCallback | null = null;
    private onCustomButtonClickedCallback: OnCustomButtonClicked | null = null;
    private onIAMDismissedCallback: OnIAMDismissed | null = null;
    private onIAMShownCallback: OnIAMShown | null = null;

    private eventLoopTimer: number = 0;
    private flushFrequency: number = 0;
    private _shutdown: boolean = false;
    private autoShowEnabled: boolean = true;
    private started: boolean = false;
    private installDate: string = "";
    private identifiedOnAnotherDevice: boolean = false;
    private refreshAssets: boolean = true;

    public constructor(config: Readonly<ISwrveConfig>, dependencies?: IDependencies) {
        dependencies = dependencies || {};

        this.platform = config.customPlatform || dependencies.platform || PAL.getPlatform(config);

        if (PAL.platform !== undefined) {
            //in case it was custom, set the static instance in PAl, as asset /campaign /storage managers reference it.
            PAL.platform = this.platform;
        }

        this.loadInstallDate();

        let lastUserId = StorageManager.getData(
            SwrveConstants.SWRVE_USER_ID,
          );
        SwrveLogger.debug(`last user ID: ${lastUserId}`);

        if (lastUserId === null) {
            lastUserId = generateUuid().toString();
        }

        this.config = configWithDefaults(config, lastUserId);
        validateConfig(this.config);

        this.resourceManager = new ResourceManagerInternal();

        this.profileManager =
            dependencies.profileManager ||
            new ProfileManager(
                this.config.userId,
                this.config.appId,
                this.config.apiKey,
                this.config.newSessionInterval,
                );

        this.realTimeUserPropertiesManager = new RealTimeUserPropertiesManager(
            this.profileManager,
        );

        this.campaignManager = dependencies.campaignManager
            || new CampaignManager(this.profileManager, this.platform, this.config, this.getResourceManager());
        this.campaignManager.onPageViewed((messageId, pageId, pageName) => {
            this.handlePageViewed(messageId, pageId, pageName);
        });
        this.campaignManager.onButtonClicked((button, campaign, pageId, pageName) => {
            this.handleButtonClicked(button, campaign, pageId, pageName);
        });

        this.campaignManager.onBackButtonClicked(() => {
            if (this.onIAMDismissedCallback) {
                this.onIAMDismissedCallback();
            }
        });

        this.restClient = dependencies.restClient || new SwrveRestClient(this.config, this.profileManager, this.platform);

        this.evtManager = dependencies.eventManager || new EventManager(this.restClient);

        this.eventFactory = new EventFactory();

        if (
            this.config.embeddedMessageConfig &&
            this.config.embeddedMessageConfig.embeddedCallback
          ) {
            if (
              typeof this.config.embeddedMessageConfig.embeddedCallback !== "function"
            ) {
              SwrveLogger.error(
                SwrveConstants.INVALID_FUNCTION.replace("$", "onEmbeddedMessage"),
              );
            }

            this.campaignManager.onEmbeddedMessage(
              this.config.embeddedMessageConfig.embeddedCallback,
            );
          }
        // if (this.config.userDisabledListener && typeof this.config.userDisabledListener !== "function") {
        //     SwrveLogger.error(
        //         SwrveConstants.INVALID_FUNCTION.replace("$", "userDisabledListener"),
        //     );
        // }
    }

    public init(): void {
        ProfileManager.storeUserId(this.config.userId);

        window.onbeforeunload = (): void => {
            this.pageStateHandler();
            this.shutdown();
          };
        window.onblur = (): void => {
           this.pageStateHandler();
        };

        this.platform.init(["language", "countryCode", "timezone", "firmware", "deviceHeight", "deviceWidth"])
            .then(() => {
                if (!this._shutdown) {
                    this.queueDeviceProperties();
                }
            });

        if (this.profileManager.getTrackingState() === SwrveTrackingStates.STOPPED) {
            SwrveLogger.warn("SwrveSDK: Tracking state is STOPPED and will not start until an api is called.");
            return;
        }

        if (this.shouldAutoStart()) {
            this.initSDK();
        } 
    }

    public getConfig(): ISwrveInternalConfig {
        return this.config;
    }

    public getUserInfo(): IUserInfo {
        const { userId, firstUse, sessionStart, isQAUser } =  this.profileManager.currentUser;
        return { userId, firstUse, sessionStart, isQAUser };
    }

    public getTrackingState(): SwrveTrackingState {
        return this.profileManager.getTrackingState();
    }

    public getMessageCenterCampaigns(personalizationProperties?: IDictionary<string>): ISwrveCampaign[] {
        if (!this.isSdkReady()) { return []; }
        if (personalizationProperties) {
            return this.campaignManager.getMessageCenterCampaigns(personalizationProperties);
        } else {
            return this.campaignManager.getMessageCenterCampaigns();
        }
    }

    public getPlatform(): IPlatform {
        return this.platform;
    }

    //******************************************** Embedded Campaigns ********************************************/

    public embeddedMessageWasShownToUser(message: ISwrveEmbeddedMessage): void {
        if (!this.isSdkReady()) { return; }
        this.campaignManager.updateCampaignState(message);
        this.queueMessageImpressionEvent(message.id, { embedded: "true" });
    }

    public embeddedMessageButtonWasPressed(
        message: ISwrveEmbeddedMessage,
        buttonName: string,
    ): void {
        if (!this.isSdkReady()) { return; }
        const nextSeqNum = this.profileManager.getNextSequenceNumber();
        const evt = this.eventFactory.getButtonClickEvent(nextSeqNum, message.id, buttonName, "true", this.platform.os, 0, "", "");
        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedNamedEvent(evt));
        }
    }

    public getPersonalizedEmbeddedMessageData(
        message: ISwrveEmbeddedMessage,
        personalizationProperties: IDictionary<string>,
    ): string | null {
        if (!this.isSdkReady()) { return ""; }
        if (message != null) {
        try {
            if (message.type === "json") {
            return TextTemplating.applyTextTemplatingToJSON(
                message.data,
                personalizationProperties,
            );
            } else {
            return TextTemplating.applyTextTemplatingToString(
                message.data,
                personalizationProperties,
            );
            }
        } catch (e) {
            SwrveLogger.error(
            "Campaign id:%s Could not resolve, error with personalization",
            e,
            );
        }
        }
        return null;
    }

    public getPersonalizedText(
        text: string,
        personalizationProperties: IDictionary<string>,
    ): string | null {
        if (!this.isSdkReady()) { return ""; }
        if (text != null) {
        try {
            return TextTemplating.applyTextTemplatingToString(
            text,
            personalizationProperties,
            );
        } catch (e) {
            SwrveLogger.error("Could not resolve, error with personalization", e);
        }
        }

        return null;
    }

    //************************************ EVENTS ********************************************************************/

    public sendEvent(keyName: string, payload: IDictionary<string|number>): void {
        if (!this.isSdkReady()) { return; }

        this.validateEventName(keyName);

        const evt = this.eventFactory.getNamedEvent(
            keyName,
            payload,
            this.profileManager.getNextSequenceNumber(),
            DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedNamedEvent(evt));
            this.sendQueuedEvents();
        }

        this.checkTriggers(keyName, payload);
    }

    public sendUserUpdateWithDate(keyName: string, date: Date): void {
        if (!this.isSdkReady()) { return; }

        this.validateEventName(keyName);

        const evt = this.eventFactory.getUserUpdateWithDate(
            keyName,
            date,
            this.profileManager.getNextSequenceNumber(),
            DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedUserUpdateWithDate(evt));
            this.sendQueuedEvents();
        }
    }

    public sendUserUpdate(attributes: IReadonlyDictionary<string | number | boolean>): void {
        if (!this.isSdkReady()) { return; }

        const evt = this.eventFactory.getUserUpdate(attributes, this.profileManager.getNextSequenceNumber(), DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedUserUpdate(evt));
            this.sendQueuedEvents();
        }
    }

    public sendPurchaseEvent(keyName: string, currency: string, cost: number, quantity: number): void {
        if (!this.isSdkReady()) { return; }

        this.validateEventName(keyName);

        const evt = this.eventFactory.getPurchaseEvent(keyName, currency, cost, quantity,
            this.profileManager.getNextSequenceNumber(), DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedPurchaseEvent(evt));
        }

        this.sendQueuedEvents();
    }

    public sendInAppPurchaseWithoutReceipt(quantity: number, productId: string, productPrice: number,
                                           currency: string, rewards?: IReadonlyDictionary<IReward>): void {
        if (!this.isSdkReady()) { return; }

        const evt = this.eventFactory.getInAppPurchaseEventWithoutReceipt(quantity, productId, productPrice,
            currency, this.profileManager.getNextSequenceNumber(), DateHelper.nowInUtcTime(), rewards);

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedInAppPurchaseEventWithoutReceipt(evt));
        }
        this.sendQueuedEvents();
    }

    public sendCurrencyGiven(currencyGiven: string, amount: number): void {
        if (!this.isSdkReady()) { return; }

        const evt = this.eventFactory.getCurrencyGivenEvent(
            currencyGiven,
            amount,
            this.profileManager.getNextSequenceNumber(),
            DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedCurrencyGivenEvent(evt));
            this.sendQueuedEvents();
        }
    }

    public sendQueuedEvents(userId: string = this.profileManager.currentUser.userId, forceUpdate: boolean = false): void {
        SwrveLogger.info("SWRVE INTERNAL: SEND QUEUED EVENTS");
        if (!this.isSdkReady()) { return; }
        this.evtManager.sendQueue(userId).then(success => {
            if (success || forceUpdate) {
                this.updateCampaignsAndResources(forceUpdate);
            }
        });
    }

    //******************************************** OTHER *********************************************************/

    public stopTracking(): void {
        this.queueDeviceProperties();
        this.started = false;
        this.profileManager.setTrackingState(SwrveTrackingStates.STOPPED);
        clearInterval(this.eventLoopTimer);
        this.eventLoopTimer = 0;
    }

    public updateCampaignsAndResources(forceUpdate: boolean = false): Promise<void> {
        SwrveLogger.info("SwrveSDK: Updating campaigns and resources");
        return this.restClient.getCampaignsAndResources()
            .then(response => {
                this.handleCampaignResponse(response);
            })
            .catch((error) => {
                SwrveLogger.warn("SwrveSDK: Get campaigns and resources failed ", String(error));
                // const status = (error && typeof error === "object") ? (error as any).status : null;
                // const message = (error && typeof error === "object")
                //     ? ((error as any).body?.message || (error as any).message)
                //     : String(error);
                // if (status === 401 && this.handle401(message)) {
                //     return;
                // }

                if (forceUpdate) {
                    const userId = this.profileManager.currentUser.userId;
                    this.realTimeUserPropertiesManager.loadStoredUserProperties(userId);
                    this.campaignManager.loadStoredCampaigns(userId);
                    this.resourceManager.getResources(userId).then(resources => {
                        if (this.onResourcesLoadedCallback != null) {
                            this.onResourcesLoadedCallback(resources || []);
                        }
                    });
                    this.autoShowMessages();
                }
            });
    }

    public saveToStorage(): void {
        if (!this.isSdkReady()) { return; }
        this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
    }

    public identify(externalUserId: string | null,
                    onIdentifySuccess: OnIdentifySuccessCallback,
                    onIdentifyError: OnIdentifyErrorCallback): void {
        if (this.config.managedMode) {
            SwrveLogger.error("SwrveSDK: identify() cannot be called when MANAGED mode is enabled. Use start() instead.");
            return;
        }

        this.sendQueuedEvents();
        
        if (externalUserId === "" || externalUserId == null) {
            SwrveLogger.error("SwrveSDK: Identify: External user id cannot be nil or empty");
            if (onIdentifyError !== undefined) {
                onIdentifyError("External user id cannot be nil or empty");
            }
            return;
        }

        const cachedSwrveUserId = this.profileManager.getSwrveIdByThirdPartyId(externalUserId);

        if (this.identifyCachedUser(cachedSwrveUserId, onIdentifySuccess)) {
            return;
        }

        this.identifyUnknownUserWithExternalId(
            externalUserId,
            cachedSwrveUserId,
            onIdentifySuccess,
            onIdentifyError,
        );
    }

    //******************************************** CALLBACKS *********************************************************/

    public queueMessageImpressionEvent(
        messageId: number,
        payload?: IDictionary<string | number>,
      ): void {
        if (!this.isSdkReady()) { return; }
        const nextSeqNum = this.profileManager.getNextSequenceNumber();
        if (!payload) {
          payload = { embedded: "false" };
        }

        payload['platform'] = this.platform.os;
        payload['deviceType'] = SWRVE_PAYLOAD_DEVICE_TYPE_TV;

        const evt = this.eventFactory.getImpressionEvent(
          messageId,
          nextSeqNum,
          payload,
        );

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedNamedEvent(evt));
        }
      }

    public onResourcesLoaded(callback: OnResourcesLoadedCallback): void {
        if (!this.isSdkReady()) { return; }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onResourcesLoaded"));
            return;
        }
        this.onResourcesLoadedCallback = callback;
    }

    public onCampaignLoaded(callback: OnCampaignLoadedCallback): void {
        if (!this.isSdkReady()) { return; }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onCampaignLoaded"));
            return;
        }

        this.onCampaignLoadedCallback = callback;
    }

    public onMessage(callback: OnMessageListener): void {
        if (!this.isSdkReady()) { return; }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onMessage"));
            return;
        }

        this.campaignManager.onMessage(callback);
    }

    public onIAMDismissed(callback: OnIAMDismissed): void {
        if (!this.isSdkReady()) { return; }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onIAMDismissed"));
            return;
        }

        this.onIAMDismissedCallback = callback;
    }

    public onCustomButtonClicked(callback: OnCustomButtonClicked): void {
        if (!this.isSdkReady()) { return; }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onCustomButtonClicked"));
            return;
        }

        this.onCustomButtonClickedCallback = callback;
    }

    public onIAMShown(callback: OnIAMShown): void {
        if (!this.isSdkReady()) { return; }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onIAMShown"));
            return;
        }

        this.onIAMShownCallback = callback;
    }

    //************************************* RESOURCES *****************************************************************/

    public getResources(callback: GetResourcesCallback): void {
        if (!this.isSdkReady()) {
            callback([]);
            return;
        }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "getResources"));
            return;
        }

        this.resourceManager.getResources(this.profileManager.currentUser.userId)
            .then(resources => {
                if (resources) {
                    SwrveLogger.info("RESOURCES READILY AVAILABLE");
                    if (callback) {
                        callback(resources);
                    }
                } else {
                    SwrveLogger.info("NO RESOURCES AVAILABLE");
                    if (callback) {
                        callback([]);
                    }
                }
            });
    }

    public getResourceManager(): ResourceManager {
        if (!this.isSdkReady()) {
            return new ResourceManager(() => [], () => new SwrveResource({}));
        }
        return this.resourceManager.getResourceManager();
    }

    public getUserResourcesDiff(callback: GetUserResourcesDiffCallback): void {
        if (!this.isSdkReady()) {
            callback({}, {}, []);
            return;
        }
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "getResources"));
            return;
        }

        const resourcesDiffKey = "resourcesDiff" + this.profileManager.currentUser.userId;
        this.restClient.getUserResourcesDiff()
            .then(response => {
                return StorageManager.saveDataWithMD5Hash(resourcesDiffKey, JSON.stringify(response.json))
                    .then(() => response.json);
            })
            .catch((error: any) => {
                SwrveLogger.warn("getUserResourcesDiff failed", error);
                return StorageManager.getDataWithMD5Hash(resourcesDiffKey)
                    .then(data => data ? JSON.parse(data) : []);
            })
            .then(json => {
                if (callback) {
                    const diff = this.transformResourcesDiff(json);
                    callback(diff[0], diff[1], json);
                }
            });
    }

    //*****************************************************************************************************************/

    public showMessageCenterCampaign(
        campaign: ISwrveCampaign,
        personalizationProperties?: IDictionary<string>,
    ): boolean {
        if (!this.isSdkReady()) { return false; }
        const properties = this.retrievePersonalizationProperties(
            {},
            personalizationProperties,
        );
        return this.campaignManager.showCampaign(campaign, properties, (msg) => {
            this.queueMessageImpressionEvent(msg.id);
            if (this.onIAMShownCallback) {
                this.onIAMShownCallback();
            }
        });
    }

    public markMessageCenterCampaignAsSeen(campaign: ISwrveCampaign): void {
        if (!this.isSdkReady()) { return; }
        this.campaignManager.markCampaignAsSeen(campaign);
    }

    public removeMessageCenterCampaign(campaign: ISwrveCampaign): void {
        if (!this.isSdkReady()) { return; }
        this.campaignManager.removeMessageCenterCampaign(campaign);
    }

    public getCampaignState(campaignId: string): ICampaignState | undefined {
        if (!this.isSdkReady()) { return undefined; }
        return this.campaignManager.getCampaignState(campaignId);
    }

    public start(userId?: string): void {
        if (userId !== undefined && userId.length === 0) {
            SwrveLogger.error("SwrveSDK: start(userId) userId cannot be empty");
            return;
        }

        if (userId !== undefined && !this.config.managedMode) {
            SwrveLogger.error("SwrveSDK: start(userId) can only be called when managedMode in SwrveConfig is enabled");
            return;
        }

        this.sendQueuedEvents();

        if (userId !== undefined) {
            this.switchUser(userId);
        } else {
            this.switchUser(this.profileManager.currentUser.userId);
        }
    }

    public isSDKStarted(): boolean {
        return this.started;
    }

    public showCampaign(
        campaign: ISwrveCampaign,
        personalizationProperties?: IDictionary<string>,
    ): boolean {
        if (!this.isSdkReady()) { return false; }
        const properties = this.retrievePersonalizationProperties(
            {},
            personalizationProperties,
        );
        return this.campaignManager.showCampaign(campaign, properties, (msg) => {
            this.queueMessageImpressionEvent(msg.id);
            if (this.onIAMShownCallback) {
                this.onIAMShownCallback();
            }
        });
    }

    public shutdown(): void {
        this._shutdown = true;
        this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
        clearTimeout(this.eventLoopTimer);

        const qa = this.profileManager.QAUser;
        if (qa && qa.reset_device_state === true) {
            SwrveLogger.info("SwrveSDK: Clearing campaign state for QA user: " + this.profileManager.currentUser.userId);
            this.campaignManager.resetCampaignState();
            StorageManager.clearData(CAMPAIGN_STATE + this.profileManager.currentUser.userId);
        }
    }

    public handleSendingQueue(): void {
        this.sendQueuedEvents();
    }

    public getRealTimeUserProperties(): IDictionary<string> {
        return this.realTimeUserPropertiesManager.UserProperties;
    }

    public retrievePersonalizationProperties(
        eventPayload?: IDictionary<string>,
        properties?: IDictionary<string>,
      ): IDictionary<string> {
        const processedRealTimeUserProperties: IDictionary<string> =
          RealTimeUserPropertiesManager.processForPersonalization(
            this.getRealTimeUserProperties(),
          );
        let resultProperties = {};

        if (
          (!properties || Object.keys(properties).length === 0) &&
          this.config.personalizationProvider
        ) {
          const providerResult = this.config.personalizationProvider(
            eventPayload || {},
          );
          resultProperties = combineDictionaries(
            processedRealTimeUserProperties,
            providerResult,
          );
        } else if (properties) {
          resultProperties = combineDictionaries(
            processedRealTimeUserProperties,
            properties,
          );
        } else {
          resultProperties = processedRealTimeUserProperties;
        }

        return resultProperties;
    }

    public isMessageShowing(): boolean {
        if (!this.isSdkReady()) { return false; }
        return this.campaignManager?.isMessageShowing() ?? false;
    }

    private checkTriggers(triggerName: string, payload: object): void {
        const qa = this.profileManager.isQAUser();

        const personalization = this.retrievePersonalizationProperties(
            payload as IDictionary<string>,
        );

        const { globalStatus, campaignStatus, campaigns } = this.campaignManager.checkTriggers(
            triggerName, payload, (msg) => {
                this.queueMessageImpressionEvent(msg.id);
                if (this.onIAMShownCallback) {
                    this.onIAMShownCallback();
                }
            },
            qa, personalization,
        );

        if (qa && globalStatus.status !== SwrveConstants.CAMPAIGN_MATCH) {
            SwrveLogger.debug(globalStatus.message);
            const event = this.eventFactory.getCampaignTriggeredEvent(triggerName, payload, globalStatus.message, "false");
            const nextQASeqNum = this.profileManager.getNextSequenceNumber();
            const wrappedEvent = this.eventFactory.getWrappedCampaignTriggeredEvent(nextQASeqNum, event);
            this.queueEvent(wrappedEvent);
        }
        if (qa && campaignStatus) {
            SwrveLogger.debug(campaignStatus.message);
            const displayed = campaignStatus.status === SwrveConstants.CAMPAIGN_MATCH ? "true" : "false";
            const event = this.eventFactory.getCampaignTriggeredEvent(triggerName, payload, campaignStatus.message, displayed, campaigns);
            const nextQASeqNum = this.profileManager.getNextSequenceNumber();
            const wrappedEvent = this.eventFactory.getWrappedCampaignTriggeredEvent(nextQASeqNum, event);
            this.queueEvent(wrappedEvent);
        }
    }

    private makeIdentityCall(thirdPartyLoginId: string,
                             swrveId: string,
                             onIdentifySuccess: OnIdentifySuccessCallback,
                             onIdentifyError: OnIdentifyErrorCallback): void {
        this.identifiedOnAnotherDevice =  false; // reset the flag
        this.restClient.identify(thirdPartyLoginId, swrveId)
            .then((response) => {
                this.profileManager.cacheThirdPartyId(thirdPartyLoginId, response.swrve_id);
        
                this.identifiedOnAnotherDevice = (response.status === SwrveConstants.EXISTING_EXTERNAL_ID);
     
                ProfileManager.setUserIdAsVerified(response.swrve_id);

                this.switchUser(response.swrve_id);

                if (onIdentifySuccess) {
                    onIdentifySuccess(response.status, response.swrve_id);
                }
            })
            .catch(error => {
                const status = (error && typeof error === "object") ? (error as any).status : null;
                SwrveLogger.info("SwrveSDK: Identify error: " + String(error));
                // we link the external id and swrve id but we dont verify it. The user should rety the identify call at a later stage.
                this.profileManager.cacheThirdPartyId(thirdPartyLoginId, swrveId);
                this.switchUser(swrveId);

                if (status === 403) {
                    StorageManager.clearData("ext-" + thirdPartyLoginId);
                }

                if (onIdentifyError) {
                    onIdentifyError(String(error));
                }
            });
    }

    private identifyCachedUser(
        cachedSwrveUserId: string | null,
        onIdentifySuccess: OnIdentifySuccessCallback,
    ): boolean {
        if (cachedSwrveUserId && ProfileManager.isUserIdVerified(cachedSwrveUserId)) {
            SwrveLogger.debug("SwrveSDK: Identify skipped, user loaded from cache.");
            this.switchUser(cachedSwrveUserId);
            if (onIdentifySuccess) {
                onIdentifySuccess("Identity API call skipped, user loaded from cache", cachedSwrveUserId);
            }
            return true;
        }
        return false;
    }

    private identifyUnknownUserWithExternalId(
        externalUserId: string,
        cachedSwrveUserId: string | null,
        onIdentifySuccess: OnIdentifySuccessCallback,
        onIdentifyError: OnIdentifyErrorCallback,
    ): void {
        const unidentifiedSwrveId = this.getUnidentifiedUserId(externalUserId, cachedSwrveUserId);
        
        this.evtManager.clearQueue();

        this.makeIdentityCall(
            externalUserId,
            unidentifiedSwrveId,
            onIdentifySuccess,
            onIdentifyError,
        );
    }

    private getUnidentifiedUserId(externalUserId: string, cachedSwrveUserId: string | null): string {
        let swrveId = cachedSwrveUserId || this.profileManager.currentUser.userId;
        const existingExternalId = StorageManager.getExternalIdForSwrveId(swrveId);
        if (existingExternalId && existingExternalId !== externalUserId) {
            swrveId = generateUuid().toString();
        }
        return swrveId;
    }

    // private handle401(message: string | null | undefined): boolean {
    //     if (message !== "User access has been disabled") {
    //         return false;
    //     }

    //     this.stopTracking();
    //     SwrveLogger.warn("User is disabled, SDK will stop tracking.");
    //     const disabledSwrveUserId = this.profileManager.currentUser.userId;
    //     const externalId = StorageManager.getExternalIdForSwrveId(disabledSwrveUserId);
     
    //     StorageManager.clearUserData(disabledSwrveUserId, externalId);
    //     this.evtManager.clearQueueAndStorage(disabledSwrveUserId);

    //     this.createAnonymousUser();

    //     if (this.config.userDisabledListener && typeof this.config.userDisabledListener === "function") {
    //         this.config.userDisabledListener(disabledSwrveUserId, externalId);
    //     }

    //     return true;
    // }

    // private createAnonymousUser(): void {
    //     this.profileManager.setCurrentUserAsNewAnonymousUser();
    //     this.campaignManager.resetCampaignState();
    // }
    private switchUser(newUserId: string): void {
        if (this.started && newUserId === this.profileManager.currentUser.userId) {  
            if (this.eventLoopTimer === 0) {
                this.updateTimer(this.flushFrequency);
            }
            return;
        }

        this.profileManager.setCurrentUser(newUserId);
        this.realTimeUserPropertiesManager.loadStoredUserProperties(newUserId);
        this.campaignManager.loadStoredCampaigns(newUserId);
        this.startNewSession();
    }

    private startNewSession(): void {
        SwrveLogger.info("SwrveSDK: Start new session");
        this.autoShowEnabled = true;  //reset this as it may have timed out
        this.initSDK(); //send all init events
        this.queueDeviceProperties(); //send device props as at constuction time we wait for PAL to send this but PAL is ready in this case
        if (this.eventLoopTimer === 0) {
            this.updateTimer(this.flushFrequency);
        }
    }

    private handlePageViewed(messageId: number, pageId: number, pageName: string): void {
        const sentPageViewEvents = this.campaignManager.getSentPageViewEvents();
        if (sentPageViewEvents.indexOf(pageId) > -1) {
            return;
        }

        const seqnum = this.profileManager.getNextSequenceNumber();
        const id = messageId.toString();
        const contextId = pageId.toString();
        const payload: IDictionary<string> = {};
        if (pageName && pageName.length > 0) {
            payload['pageName'] = pageName;
        }
        payload['platform'] = this.platform.os;
        payload['deviceType'] = SWRVE_PAYLOAD_DEVICE_TYPE_TV;

        const event: any = this.eventFactory.getPageViewEvent(seqnum, id, contextId, payload);
        this.queueEvent(event);
        sentPageViewEvents.push(pageId);

        if (this.profileManager.isQAUser()) {
            const qaEvent: any = this.eventFactory.getWrappedGenericCampaignEvent(event);
            this.queueEvent(qaEvent);
            this.sendQueuedEvents();
        }
    }

    private handleButtonClicked(button: ISwrveButton, parentCampaign: ISwrveCampaign, pageId: string, pageName: string): void {
        const type = String(button.type.value);
        const action = String(button.action.value);
        const campaignId = parentCampaign.id;
        const messageId = this.campaignManager.getCampaignVariantID(parentCampaign);
        const buttonName = button.name;
        const buttonId = button.button_id || 0;

        switch (type) {
            case SwrveConstants.DISMISS:
                this.dismissButtonClicked(messageId, pageId, pageName, buttonName, buttonId);
                break;
            case SwrveConstants.CUSTOM:
                this.customButtonClicked(campaignId, messageId, pageId, pageName, buttonName, buttonId, action);
                break;
            case SwrveConstants.PAGE_LINK:
                this.pageLinkButtonClicked(messageId, pageId, pageName, buttonName, buttonId, action);
                break;
            case SwrveConstants.COPY_TO_CLIPBOARD:
                this.copyToClipboard(action);
                break;
        }

        this.queueButtonEvents(button);
        this.queueButtonUserUpdates(button);
    }

    private dismissButtonClicked(messageId: number, pageId: string, pageName: string, buttonName: string, buttonId: number): void {
        const seqnum = this.profileManager.getNextSequenceNumber();
        const id = messageId.toString();
        const contextId = pageId.toString();
        const payload: IDictionary<string> = {};
        if (pageName && pageName.length > 0) {
            payload['pageName'] = pageName;
        }
        if (buttonName && buttonName.length > 0) {
            payload['buttonName'] = buttonName;
        }
        if (buttonId > 0) {
            payload['buttonId'] = buttonId.toString();
        }
        payload['platform'] = this.platform.os;
        payload['deviceType'] = SWRVE_PAYLOAD_DEVICE_TYPE_TV;

        const event: any = this.eventFactory.getDismissEvent(seqnum, id, contextId, payload);
        this.queueEvent(event);

        if (this.profileManager.isQAUser()) {
            const qaEvent: any = this.eventFactory.getWrappedGenericCampaignEvent(event);
            this.queueEvent(qaEvent);
            this.sendQueuedEvents();
        }

        if (this.onIAMDismissedCallback) {
            this.onIAMDismissedCallback();
        }
    }

    private customButtonClicked(campaignId: number, messageId: number, pageId: string, pageName: string,
                                buttonName: string, buttonId: number, action: string): void {
        const seqnum = this.profileManager.getNextSequenceNumber();
        const event: any = this.eventFactory.getButtonClickEvent(seqnum, messageId, buttonName, "false",
            this.platform.os, buttonId, pageId, pageName);
        this.queueEvent(event);

        if (this.profileManager.isQAUser()) {
            const qaSeqnum = this.profileManager.getNextSequenceNumber();
            // const action = action || "No action"; // TODO: check if this is needed
            const qaEvent: any = this.eventFactory.getQAButtonClickEvent(campaignId, messageId, buttonName, "deeplink", action, qaSeqnum);
            this.queueEvent(qaEvent);
            this.sendQueuedEvents();
        }

        if (this.onCustomButtonClickedCallback) {
            this.onCustomButtonClickedCallback(action);
        } else if (action.match(/^https?:\/\//)) {
            this.platform.openLink(action);
        }
    }

    private async copyToClipboard(text: string): Promise<void> {
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
              } catch (err) {
                SwrveLogger.error("Clipboard API error:", err);
              }
        }
    }

    private pageLinkButtonClicked(messageId: number, pageId: string, pageName: string,
                                  buttonName: string, buttonId: number, pageToId: string): void {
        const sentNavigationEvents = this.campaignManager.getSentNavigationEvents();
        if (sentNavigationEvents.indexOf(buttonId) > -1) {
            return;
        }

        const seqnum = this.profileManager.getNextSequenceNumber();
        const id = messageId.toString();
        const contextId = pageId.toString();
        const payload: IDictionary<string> = {};
        if (pageName && pageName.length > 0) {
            payload['pageName'] = pageName;
        }
        if (buttonName && buttonName.length > 0) {
            payload['buttonName'] = buttonName;
        }
        if (buttonId > 0) {
            payload['buttonId'] = buttonId.toString();
        }
        payload['platform'] = this.platform.os;
        payload['deviceType'] = SWRVE_PAYLOAD_DEVICE_TYPE_TV;
        payload['to'] = pageToId;

        const event: any = this.eventFactory.getNavigationEvent(seqnum, id, contextId, payload);
        this.queueEvent(event);
        sentNavigationEvents.push(buttonId);

        if (this.profileManager.isQAUser()) {
            const qaEvent: any = this.eventFactory.getWrappedGenericCampaignEvent(event);
            this.queueEvent(qaEvent);
            this.sendQueuedEvents();
        }
    }

    private queueButtonEvents(button: ISwrveButton): void {
        if (button.events) {
            button.events.forEach(event => {
                let personalizedPayload: IDictionary<string | number> = {};
                if (event.payload) {
                    const personalizationProperties = this.retrievePersonalizationProperties();
                    event.payload.forEach(item => {
                        let personalizedValue: string | number | null = item.value;
                        if (typeof item.value === 'string') {
                            personalizedValue = this.getPersonalizedText(item.value, personalizationProperties);
                        }
                        if (personalizedValue != null) {
                            personalizedPayload = {
                                ...personalizedPayload,
                                [item.key]: personalizedValue,
                            };
                        }
                    });
                }
                const sendEvent = this.eventFactory.getNamedEvent(event.name,
                    personalizedPayload,
                    this.profileManager.getNextSequenceNumber(),
                    DateHelper.nowInUtcTime(),
                );
                this.queueEvent(sendEvent);

                if (this.profileManager.isQAUser()) {
                    this.queueEvent( this.eventFactory.getWrappedNamedEvent(sendEvent));
                    this.sendQueuedEvents();
                }
            });
        }
    }

    private queueButtonUserUpdates(button: ISwrveButton): void {
        if (button.user_updates) {
            const personalizationProperties = this.retrievePersonalizationProperties();
            let personalizedAttributes: IDictionary<string | number | boolean > = {};
            button.user_updates.forEach(user_update => {
                let personalizedValue: string | number | boolean | null = user_update.value;
                if (typeof user_update.value === 'string') {
                    personalizedValue = this.getPersonalizedText(user_update.value, personalizationProperties);
                }
                if (personalizedValue != null) {
                    personalizedAttributes = {
                        ...personalizedAttributes,
                        [user_update.key]: personalizedValue,
                    };
                }
            });
            const userUpdateEvent = this.eventFactory.getUserUpdate(personalizedAttributes,
                this.profileManager.getNextSequenceNumber(),
                DateHelper.nowInUtcTime(),
            );
            this.queueEvent(userUpdateEvent);
            if (this.profileManager.isQAUser()) {
                this.queueEvent(this.eventFactory.getWrappedUserUpdate(userUpdateEvent));
                this.sendQueuedEvents();
            }
        }
    }

    private autoShowMessages(): void {
        SwrveLogger.debug("AUTO SHOW MESSAGES " + this.autoShowEnabled);
        if (!this.autoShowEnabled) {
            return;
        }

        this.checkTriggers(SwrveConstants.SWRVE_AUTOSHOW_AT_SESSION_START_TRIGGER, {});
        this.autoShowEnabled = false;
    }

    private queueStartSessionEvent(): void {
        const event = this.eventFactory.getStartSessionEvent(this.profileManager.getNextSequenceNumber(), DateHelper.nowInUtcTime());
        this.queueEvent(event);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedSessionStart(event));
        }
    }

    private handleCampaignResponse(response: IRestResponse<ISwrveCampaignResourceResponse>): void {
        if (Object.keys(response.json).length !== 0) {
            this.handleRealTimeUserProperties(response.json);
            const personalizationProperties = this.retrievePersonalizationProperties();

            //this will also download assets, pass in up todate personalizationProperties
            this.campaignManager.storeCampaigns(response.json, personalizationProperties, (error?: Error) => {
                SwrveLogger.debug("ON ASSETS LOADED");
                this.refreshAssets = false;
                this.autoShowMessages();

                if (this.onCampaignLoadedCallback) {
                    this.onCampaignLoadedCallback(error);
                }
            });

            this.handleQAUser(response.json);
            this.handleFlushRefresh(response.json);

            if (this.profileManager.isQAUser()) {
                this.sendCampaignsDownloadedEvent();
            }
        } else {
            //if etag takes affect and no campaigns to update
            //then we still want to refresh assets just once on the first launch
            if (this.refreshAssets) {
                SwrveLogger.debug("Refresh Assets");
                this.refreshAssets = false;
                const personalizationProperties = this.retrievePersonalizationProperties();
                this.campaignManager.refreshAssets(personalizationProperties, (error?: Error) => {
                    SwrveLogger.debug("ON ASSETS LOADED");
                    //campaigns wil have already been loaded from storage on init
                    if (this.onCampaignLoadedCallback) {
                        this.onCampaignLoadedCallback(error);
                    }
                });
            }
        }
        this.handleResources(response.json);

        if (response.etag != null) {
            this.profileManager.storeEtagHeader(response.etag);
        }
    }

    private handleRealTimeUserProperties(
        response: ISwrveCampaignResourceResponse,
      ): void {
        this.realTimeUserPropertiesManager.storeUserProperties(response);
      }

    private sendCampaignsDownloadedEvent(): void {
        const ids = this.campaignManager.getCampaignIDs();

        if (ids.length > 0) {
            const nextSeqNum = this.profileManager.getNextSequenceNumber();
            this.queueEvent(this.eventFactory.getCampaignsDownloadedEvent(nextSeqNum, ids));
        }
    }

    private initSDK(): void {
        SwrveLogger.info("SwrveSDK: Initialising Swrve SDK");
        this.started = true;
        this.profileManager.setTrackingState(SwrveTrackingStates.STARTED);
        this.autoShowEnabled = false;
        const isValid = this.profileManager.hasSessionRestored();
        if (!isValid) {
          SwrveLogger.debug("SwrveSDK: Setting autoShowEnabled to true");
          this.queueStartSessionEvent();
          this.checkFirstUserInitiated();
          this.autoShowEnabled = true;
        }

        this.disableAutoShowAfterDelay();
        this.sendQueuedEvents(this.profileManager.currentUser.userId, true);
        SwrveLogger.info("SwrveSDK: Config: ", this.config);
    }

    private shouldAutoStart(): boolean {
        if (!this.config.autoStartLastUser) {
            return false;
        }
        if (this.config.managedMode) {
            const savedUserId = ProfileManager.getStoredUserId();
            return Boolean(savedUserId && savedUserId.length > 0);
        }
        return true;
    }

    private disableAutoShowAfterDelay(): void {
        setTimeout(() => {
            SwrveLogger.debug("SwrveSDK: Auto show timed out: " + this.config.autoShowMessagesMaxDelay);
            this.autoShowEnabled = false;
        }, this.config.autoShowMessagesMaxDelay);
    }

    private queueEvent(event: SwrveEvent): void {
        if (!this.isSdkReady()) { return; }
        this.evtManager.queueEvent(event);

        if (this.evtManager.queueSize > this.evtManager.MAX_QUEUE_SIZE) {
            this.handleSendingQueue();
        }
    }

    private handleResources(response: ISwrveCampaignResourceResponse): void {
        if (response.user_resources) {
            this.resourceManager.storeResources(response.user_resources, this.profileManager.currentUser.userId);
            const resources = this.resourceManager.getResourceManager().getResources();
            if (this.onResourcesLoadedCallback != null) {
                this.onResourcesLoadedCallback(resources || []);
            }
        } else {
            this.resourceManager.getResources(this.profileManager.currentUser.userId).then(resources => {
                if (this.onResourcesLoadedCallback != null) {
                    this.onResourcesLoadedCallback(resources || []);
                }
            });
        }
    }

    private handleUpdate(): void {
        if (this.evtManager.getQueue().length > 0) {
            this.handleSendingQueue();
        }
    }

    private handleQAUser(response: ISwrveCampaignResourceResponse): void {
        if (response.qa) {
            this.profileManager.setAsQAUser(response.qa);
        } else {
            this.profileManager.clearQAUser();
        }
    }

    private handleFlushRefresh(response: ISwrveCampaignResourceResponse): void {
        const flushFrequency = response.flush_frequency || 30000;

        this.updateTimer(flushFrequency);
    }

    private updateTimer(flushFrequency: number): void {
        if (this.eventLoopTimer === 0) { //first time
            this.flushFrequency = flushFrequency;
            this.eventLoopTimer = setInterval(() => this.handleUpdate(), flushFrequency);
        } else if (this.flushFrequency !== flushFrequency) { //only reset it if it different
            this.flushFrequency = flushFrequency;
            if (this.eventLoopTimer !== 0) {
                clearInterval(this.eventLoopTimer);
            }
            this.eventLoopTimer = setInterval(() => this.handleUpdate(), flushFrequency);
        }
    }

    private validateEventName(name: string): void {
        if (/[Ss]wrve/.exec(name)) {
            throw new Error(SwrveConstants.INVALID_EVENT_NAME);
        }
    }

    private checkFirstUserInitiated(): void {
        const currentUser = this.profileManager.currentUser;
        if (
          (currentUser && currentUser.firstUse === 0) ||
          currentUser.firstUse === undefined
        ) {
          SwrveLogger.debug("First session on device detected. logging...");
          currentUser.firstUse = DateHelper.nowInUtcTime();
          if (this.identifiedOnAnotherDevice === false) {
            const evt = this.eventFactory.getFirstInstallEvent(
              currentUser.firstUse,
              this.profileManager.getNextSequenceNumber(),
            );
            this.queueEvent(evt);
            if (this.profileManager.isQAUser()) {
                this.queueEvent(this.eventFactory.getWrappedFirstInstallEvent(evt));
             }
          }
        }
      }

    private loadInstallDate(): void {
        const storedInstallDate = StorageManager.getData("firstInstallDate");
        if (storedInstallDate != null && storedInstallDate !== "") {
            this.installDate = storedInstallDate;
        }

        if (this.installDate.length < 1) {
          this.installDate = getInstallDateFormat(DateHelper.nowInUtcTime());
          StorageManager.saveData(
            "firstInstallDate",
            String(this.installDate),
          );
        }
    }

    private queueDeviceProperties(): void {
        const trackingState = this.profileManager.getTrackingState();
        const initMode = this.config.managedMode ? "managed" : "auto";
        const deviceProperties = queryDeviceProperties(this.platform, this.profileManager, this.installDate, trackingState, initMode);
        const evt = this.eventFactory.getDeviceUpdate(deviceProperties,
            this.profileManager.getNextSequenceNumber(),
            DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedDeviceUpdate(evt));
        }
        SwrveLogger.info("Swrve Device Properties: ", deviceProperties);
    }

    private transformResourcesDiff(resources: ReadonlyArray<IResourceDiff>): [IDictionary<IUserResource>, IDictionary<IUserResource>] {
        const mapOldResources: IDictionary<IUserResource> = {};
        const mapNewResources: IDictionary<IUserResource> = {};
        resources.forEach(resource => {
            const mapOldResourceValues: IUserResource = {};
            const mapNewResourceValues: IUserResource = {};
            for (const key in resource.diff) {
                if (resource.diff.hasOwnProperty(key)) {
                    mapOldResourceValues[key] = resource.diff[key].old;
                    mapNewResourceValues[key] = resource.diff[key].new;
                }
            }
            mapOldResources[resource.uid] = mapOldResourceValues;
            mapNewResources[resource.uid] = mapNewResourceValues;
        });

        return [mapOldResources, mapNewResources];
    }

    private pageStateHandler(): void {
        /** Store all user data before page close or focus out */
        this.profileManager.saveCurrentUserBeforeSessionEnd();
    }

    private isSdkReady(): boolean {
        if (this.profileManager.getTrackingState() === SwrveTrackingStates.STOPPED) {
            SwrveLogger.warn("SwrveSDK: Tracking state is STOPPED and needs to be started before calling this api.");
            return false;
        }
        if (!this.started) {
            SwrveLogger.warn("SwrveSDK: Needs to be started before calling this api.");
            return false;
        }
        return true;
    }
}

export interface IDependencies {
    campaignManager?: CampaignManager;
    eventManager?: EventManager;
    profileManager?: ProfileManager;
    restClient?: SwrveRestClient;
    platform?: IPlatform;
}
