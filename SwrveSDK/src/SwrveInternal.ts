import {EventFactory} from "./Events/EventFactory";
import {ProfileManager} from "./Profile/ProfileManager";
import PAL from "./utils/PAL";
import {CampaignManager} from "./Campaigns/CampaignManager";
import {ISwrveButton, 
    ISwrveCampaign, 
    ISwrveCampaignResourceResponse, 
    ISwrveEmbeddedMessage, 
    IUserResource } from "./Campaigns/ISwrveCampaign";
import {IPlatform, NETWORK_CONNECTED, NetworkListener} from "./utils/platforms/IPlatform";
import {ResourceManagerInternal} from "./Resources/ResourceManagerInternal";
import {ResourceManager} from "./Resources/ResourceManager";
import {
    GetResourcesCallback,
    GetUserResourcesDiffCallback,
    OnCampaignLoadedCallback,
    OnCustomButtonClicked,
    OnIAMDismissed,
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
import { CAMPAIGN_STATE } from "./utils/SwrveConstants";
import { TextTemplating } from "./utils/TextTemplating";
import { RealTimeUserPropertiesManager } from "./UserProperties/RealTimeUserPropertiesManager";
import { combineDictionaries } from "./utils/DictionaryHelper";
import { generateUuid } from "./utils/uuid";
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

    private eventLoopTimer: number = 0;
    private flushFrequency: number = 0;
    private _shutdown: boolean = false;
    private autoShowEnabled: boolean = true;
    private pauseSDK: boolean = false;
    private installDate: string = "";
    private identifyNetworkMonitorHandle?: NetworkListener;
    private campaignNetworkMonitorHandle?: NetworkListener;
    private identifiedOnAnotherDevice: boolean = false;

    public constructor(config: Readonly<ISwrveConfig>, dependencies?: IDependencies) {
        dependencies = dependencies || {};

        this.platform = dependencies.platform || PAL.getPlatform();

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

        this.campaignManager = dependencies.campaignManager
            || new CampaignManager(this.profileManager, this.platform, this.config, this.getResourceManager());
        this.campaignManager.onButtonClicked((button, campaign) => this.handleButtonClicked(button, campaign));

        this.restClient = dependencies.restClient || new SwrveRestClient(this.config, this.profileManager, this.platform);

        this.evtManager = dependencies.eventManager || new EventManager(this.restClient);
        this.realTimeUserPropertiesManager = new RealTimeUserPropertiesManager(
            this.profileManager,
          );         

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

        if (this.isIdentifyCallPending()) {
            const externalId = StorageManager.getData(SwrveConstants.IDENTIFY_CALL_PENDING_EXTERNAL_ID)!;
            const swrveId = StorageManager.getData(SwrveConstants.IDENTIFY_CALL_PENDING)!;
            this.makeIdentityCall(externalId, this.profileManager.currentUser.userId, swrveId, () => this.initSDK());
        } else if (this.config.managedMode) {
            SwrveLogger.debug("SwrveSDK: This application has started Swrve in MANAGED mode. Call start() to begin tracking");
            this.stop();
        } else {
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

    public getMessageCenterCampaigns(): ISwrveCampaign[] {
        return this.campaignManager.getMessageCenterCampaigns();
    }

    //******************************************** Embedded Campaigns ********************************************/

    public embeddedMessageWasShownToUser(message: ISwrveEmbeddedMessage): void {
        this.campaignManager.updateCampaignState(message);
        this.queueMessageImpressionEvent(message.id, { embedded: "true" });
    }

    public embeddedMessageButtonWasPressed(
        message: ISwrveEmbeddedMessage,
        buttonName: string,
    ): void {
        const nextSeqNum = this.profileManager.getNextSequenceNumber();
        const evt = this.eventFactory.getButtonClickEvent(
        nextSeqNum,
        message.id,
        buttonName,
        "true",
        );
        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedNamedEvent(evt));
        }
    }

    public getPersonalizedEmbeddedMessageData(
        message: ISwrveEmbeddedMessage,
        personalizationProperties: IDictionary<string>,
    ): string | null {
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
        if (this.pauseSDK) return;

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
        if (this.pauseSDK) return;

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
        if (this.pauseSDK) return;

        const evt = this.eventFactory.getUserUpdate(attributes, this.profileManager.getNextSequenceNumber(), DateHelper.nowInUtcTime());

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedUserUpdate(evt));
            this.sendQueuedEvents();
        }
    }

    public sendPurchaseEvent(keyName: string, currency: string, cost: number, quantity: number): void {
        if (this.pauseSDK) return;

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
        if (this.pauseSDK) return;

        const evt = this.eventFactory.getInAppPurchaseEventWithoutReceipt(quantity, productId, productPrice,
            currency, this.profileManager.getNextSequenceNumber(), DateHelper.nowInUtcTime(), rewards);

        this.queueEvent(evt);

        if (this.profileManager.isQAUser()) {
            this.queueEvent(this.eventFactory.getWrappedInAppPurchaseEventWithoutReceipt(evt));
        }
        this.sendQueuedEvents();
    }

    public sendCurrencyGiven(currencyGiven: string, amount: number): void {
        if (this.pauseSDK) return;

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
        if (this.pauseSDK) {
            return;
        }
        this.evtManager.sendQueue(userId).then(success => {
            if (success || forceUpdate) {
                this.updateCampaignsAndResources(forceUpdate);
            }
        });
    }

    //******************************************** OTHER *********************************************************/

    public stop(): void {
        this.pauseSDK = true;
        clearInterval(this.eventLoopTimer);
        this.eventLoopTimer = 0;
    }

    public updateCampaignsAndResources(forceUpdate: boolean = false): Promise<void> {
        SwrveLogger.info("updateCampaignsAndResources");
        return this.restClient.getCampaignsAndResources()
            .then(response => {
                this.handleCampaignResponse(response);

                if (this.isCampaignCallPending()) {
                    this.cleanUpCampaignCallPending();
                }
            })
            .catch((error) => {
                SwrveLogger.warn("getCampaigns failed ", error);

                if (!this.isCampaignCallPending()) {
                    this.campaignNetworkMonitorHandle = this.platform.monitorNetwork((state) => {
                        if (state === NETWORK_CONNECTED) {
                            SwrveLogger.info("NETWORK RECONNECTED - RETRY CAMPAIGNS AND RESOURCES");
                            this.platform.stopMonitoringNetwork(this.campaignNetworkMonitorHandle!);
                            this.updateCampaignsAndResources();
                        }
                    });
                }

                StorageManager.saveData(SwrveConstants.CAMPAIGN_CALL_PENDING, this.profileManager.currentUser.userId);

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
        this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
    }

    public identify(thirdPartyLoginId: string | null, onIdentifyError: OnIdentifyErrorCallback): void {
        if (this.config.managedMode) {
            SwrveLogger.error("SwrveSDK: identify() cannot be called when MANAGED mode is enabled. Use start() instead.");
            return;
        }

        this.sendQueuedEvents();
        this.pauseSDK = true;

        const previousSwrveId: string = this.profileManager.currentUser.userId;

        if (thirdPartyLoginId === "" || thirdPartyLoginId == null) {
            this.createAnonymousUser();
            this.startNewSession();
            return;
        }

        const cachedSwrveUserId = this.profileManager.getSwrveIdByThirdPartyId(thirdPartyLoginId);
        if (cachedSwrveUserId) {
            this.pauseSDK = false;
            if (cachedSwrveUserId !== this.profileManager.currentUser.userId) {
                this.verifyAndSwitchUser(cachedSwrveUserId);
            }
        } else {
            if (ProfileManager.isUserIdVerified(this.profileManager.currentUser.userId)
                || (!this.profileManager.currentUser.isAnonymous)) {
                this.createAnonymousUser();
            }
            
            const swrveId = this.profileManager.currentUser.userId;
            this.makeIdentityCall(thirdPartyLoginId, previousSwrveId, swrveId, onIdentifyError);
        }
    }

    //******************************************** CALLBACKS *********************************************************/

    public queueMessageImpressionEvent(
        messageId: number,
        payload?: IDictionary<string | number>,
      ): void {
        const nextSeqNum = this.profileManager.getNextSequenceNumber();
        if (!payload) {
          payload = { embedded: "false" };
        }
    
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
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onResourcesLoaded"));
            return;
        }
        this.onResourcesLoadedCallback = callback;
    }

    public onCampaignLoaded(callback: OnCampaignLoadedCallback): void {
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onCampaignLoaded"));
            return;
        }

        this.onCampaignLoadedCallback = callback;
    }

    public onMessage(callback: OnMessageListener): void {
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onMessage"));
            return;
        }

        this.campaignManager.onMessage(callback);
    }

    public onIAMDismissed(callback: OnIAMDismissed): void {
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onIAMDismissed"));
            return;
        }

        this.onIAMDismissedCallback = callback;
    }

    public onCustomButtonClicked(callback: OnCustomButtonClicked): void {
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "onCustomButtonClicked"));
            return;
        }

        this.onCustomButtonClickedCallback = callback;
    }

    //************************************* RESOURCES *****************************************************************/

    public getResources(callback: GetResourcesCallback): void {
        if (typeof callback !== "function") {
            SwrveLogger.error(SwrveConstants.INVALID_FUNCTION.replace("$", "getResources"));
            return;
        }

        this.resourceManager.getResources(this.profileManager.currentUser.userId)
            .then(resources => {
                if (resources) {
                    SwrveLogger.info("RESOURCES READILY AVAILABLE");
                    callback(resources);
                } else {
                    SwrveLogger.info("RESOURCES NEED TO BE RETRIEVED");
                    this.profileManager.clearEtagHeader();
                    this.restClient.getCampaignsAndResources()
                        .then(response => {
                            this.handleCampaignResponse(response);
                            if (callback) {
                                callback(this.resourceManager.getResourceManager().getResources() || []);
                            }
                        })
                        .catch((error) => {
                            SwrveLogger.warn("getCampaigns failed ", error);
                            if (callback) {
                                callback([]);
                            }
                        });
                }
            });
    }

    public getResourceManager(): ResourceManager {
        return this.resourceManager.getResourceManager();
    }

    public getUserResourcesDiff(callback: GetUserResourcesDiffCallback): void {
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

    public start(userId?: string): void {
        if (this.config.managedMode) {
            if (userId) {
                if (this.profileManager.currentUser.userId === userId) {
                    if (this.pauseSDK) {
                        this.pauseSDK = false;
                        this.initSDK();
                    } else {
                        SwrveLogger.info("SwrveSDK: Already running on userID: " + userId);
                    }
                } else {
                    this.stopAndSwitchUser(userId);
                }   
            } else if (this.pauseSDK) {
                this.pauseSDK = false;
                this.initSDK();
            } else {
                SwrveLogger.info("SwrveSDK: Already running on userID: " + this.profileManager.currentUser.userId);
            }
        } else {
            SwrveLogger.error("SwrveSDK: start() can only be called when managedMode in SwrveConfig is enabled");
        }
    }

    public stopAndSwitchUser(userId: string): void {
        if (this.config.managedMode) {
            this.stop();
            this.switchUser(userId);
        } else {
            SwrveLogger.error("SwrveSDK: switchUser() can only be called when managedMode in SwrveConfig is enabled");
        }
    }

    public isSDKStarted(): boolean {
        return !this.pauseSDK;
    }

    public showCampaign(
        campaign: ISwrveCampaign, 
        personalizationProperties?: IDictionary<string>,
    ): boolean {
        const properties = this.retrievePersonalizationProperties(
            {},
            personalizationProperties,
        );
        return this.campaignManager.showCampaign(campaign, properties, (msg) => { this.queueMessageImpressionEvent(msg.id); });
    }

    public shutdown(): void {
        this._shutdown = true;
        this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
        clearTimeout(this.eventLoopTimer);
        this.profileManager.clearEtagHeader();

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

    public isIdentifyCallPending(): boolean {
        return Boolean(StorageManager.getData(SwrveConstants.IDENTIFY_CALL_PENDING));
    }

    public isCampaignCallPending(): boolean {
        return Boolean(StorageManager.getData(SwrveConstants.CAMPAIGN_CALL_PENDING));
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

    private checkTriggers(triggerName: string, payload: object): void {
        const qa = this.profileManager.isQAUser();

        const personalization = this.retrievePersonalizationProperties(
            payload as IDictionary<string>,
        );

        const { globalStatus, campaignStatus, campaigns } = this.campaignManager.checkTriggers(
            triggerName, payload, (msg) => this.queueMessageImpressionEvent(msg.id), qa, personalization,
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

    private makeIdentityCall(thirdPartyLoginId: string, previousSwrveId: string, 
                             swrveId: string, onIdentifyError: OnIdentifyErrorCallback): void {
        this.identifiedOnAnotherDevice =  false; // reset the flag
        this.restClient.identify(thirdPartyLoginId, swrveId)
            .then((response) => {
                this.profileManager.cacheThirdPartyId(thirdPartyLoginId, response.swrve_id);
                if (response.status === SwrveConstants.NEW_EXTERNAL_ID ||
                    response.status === SwrveConstants.EXISTING_EXTERNAL_ID_MATCHES_SWRVE_ID) {
                    this.pauseSDK = false;
                    if (previousSwrveId !== response.swrve_id) {
                        this.verifyAndSwitchUser(response.swrve_id);
                    }
                } else if (response.status === SwrveConstants.EXISTING_EXTERNAL_ID) {
                    this.identifiedOnAnotherDevice =  true;
                    this.verifyAndSwitchUser(response.swrve_id);
                }

                if (this.isIdentifyCallPending()) {
                    this.cleanUpIdentifyCallPending();
                }
                
                ProfileManager.setUserIdAsVerified(this.profileManager.currentUser.userId);
            })
            .catch(error => {
                SwrveLogger.info("Identify error" + error);
                this.handleIdentifyOffline(thirdPartyLoginId, previousSwrveId, swrveId, onIdentifyError);

                this.pauseSDK = false;
                if (onIdentifyError) {
                    onIdentifyError(error);
                }
            });
    }

    private handleIdentifyOffline(thirdPartyLoginId: string, previousSwrveId: string, 
                                  swrveId: string, onIdentifyError: OnIdentifyErrorCallback): void {
        const existingThirdPartyLoginId = StorageManager.getData(SwrveConstants.IDENTIFY_CALL_PENDING_EXTERNAL_ID);
        if (existingThirdPartyLoginId && existingThirdPartyLoginId !== thirdPartyLoginId) {
            this.evtManager.clearQueueAndStorage(this.profileManager.currentUser.userId);
        } else {
            this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
        }

        if (!this.isIdentifyCallPending()) {
            this.identifyNetworkMonitorHandle = this.platform.monitorNetwork((state: number) => {
                if (state === NETWORK_CONNECTED) {
                    SwrveLogger.info("connected");
                    this.makeIdentityCall(StorageManager.getData(SwrveConstants.IDENTIFY_CALL_PENDING_EXTERNAL_ID)!, 
                    previousSwrveId, swrveId, onIdentifyError);
                }
            });
        }

        StorageManager.saveData(SwrveConstants.IDENTIFY_CALL_PENDING, swrveId);
        StorageManager.saveData(SwrveConstants.IDENTIFY_CALL_PENDING_EXTERNAL_ID, thirdPartyLoginId);
    }

    private cleanUpCampaignCallPending(): void {
        if (this.campaignNetworkMonitorHandle !== undefined) {
            this.platform.stopMonitoringNetwork(this.campaignNetworkMonitorHandle);
            delete this.campaignNetworkMonitorHandle;
        }

        StorageManager.clearData(SwrveConstants.CAMPAIGN_CALL_PENDING);
    }

    private cleanUpIdentifyCallPending(): void {
        if (this.identifyNetworkMonitorHandle !== undefined) {
            this.platform.stopMonitoringNetwork(this.identifyNetworkMonitorHandle);
            delete this.identifyNetworkMonitorHandle;
        }

        const anonId = StorageManager.getData(SwrveConstants.IDENTIFY_CALL_PENDING);
        if (anonId) {
            this.sendQueuedEvents(anonId);
        }
        StorageManager.clearData(SwrveConstants.IDENTIFY_CALL_PENDING);
        StorageManager.clearData(SwrveConstants.IDENTIFY_CALL_PENDING_EXTERNAL_ID);
    }

    private createAnonymousUser(): void {
        this.profileManager.setCurrentUserAsNewAnonymousUser();
        this.campaignManager.resetCampaignState();
    }

    private verifyAndSwitchUser(newUserId: string): void {
        ProfileManager.setUserIdAsVerified(newUserId);
        this.switchUser(newUserId);
    }

    private switchUser(newUserId: string): void {
        this.profileManager.setCurrentUser(newUserId);
        this.realTimeUserPropertiesManager.loadStoredUserProperties(newUserId);
        this.campaignManager.loadStoredCampaigns(newUserId);
        this.startNewSession();
    }

    private startNewSession(): void {
        SwrveLogger.info("Start new session");
        this.pauseSDK = false;
        this.autoShowEnabled = true;  //reset this as it may have timed out
        this.initSDK(); //send all init events
        this.queueDeviceProperties(); //send device props as at constuction time we wait for PAL to send this but PAL is ready in this case

        if (this.eventLoopTimer === 0) {
            this.updateTimer(this.flushFrequency);
        }
    }

    private handleButtonClicked(button: ISwrveButton, parentCampaign: ISwrveCampaign): void {
        const type = String(button.type.value);
        const action = String(button.action.value);
        const messageId = this.campaignManager.getCampaignVariantID(parentCampaign);
        this.queueEvent(this.eventFactory.getButtonClickEvent(this.profileManager.getNextSequenceNumber(), 
        messageId, button.name, "false"));

        if (this.profileManager.isQAUser()) {
            let logType;
            switch (type) {
                case SwrveConstants.DISMISS: logType = "dismiss"; break;
                case SwrveConstants.CUSTOM: logType = "deeplink"; break;
            }
            if (logType) {
                this.queueEvent(
                    this.eventFactory.getQAButtonClickEvent(
                        parentCampaign.id,
                        messageId,
                        button.name,
                        logType,
                        action || "No action",
                        this.profileManager.getNextSequenceNumber()),
                );
                this.sendQueuedEvents();
            }
        }

        if (type === SwrveConstants.DISMISS && this.onIAMDismissedCallback) {
            this.onIAMDismissedCallback();
        } else if (type === SwrveConstants.CUSTOM) {
            if (this.onCustomButtonClickedCallback) {
                this.onCustomButtonClickedCallback(action);
            } else if (action.match(/^https?:\/\//)) {
                this.platform.openLink(action);
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
            this.campaignManager.storeCampaigns(response.json, () => {
                SwrveLogger.debug("ON ASSETS LOADED");
                this.autoShowMessages();
            });
            this.handleRealTimeUserProperties(response.json);
            this.handleQAUser(response.json);
            this.handleFlushRefresh(response.json);

            if (this.onCampaignLoadedCallback) {
                this.onCampaignLoadedCallback();
            }

            if (this.profileManager.isQAUser()) {
                this.sendCampaignsDownloadedEvent();
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
        SwrveLogger.info("Initialising Swrve SDK");
        this.autoShowEnabled = false;
        const isValid = this.profileManager.hasSessionRestored();
        if (!isValid) {
          SwrveLogger.debug("Setting autoShowBack to true");
          this.queueStartSessionEvent();
          this.checkFirstUserInitiated();
          this.autoShowEnabled = true;
        }
  
        this.disableAutoShowAfterDelay();
        this.sendQueuedEvents(this.profileManager.currentUser.userId, true);
        SwrveLogger.info("Swrve Config: ", this.config);
    }

    private disableAutoShowAfterDelay(): void {
        setTimeout(() => {
            SwrveLogger.debug("AUTO SHOW TIMED OUT " + this.config.autoShowMessagesMaxDelay);
            this.autoShowEnabled = false;
        }, this.config.autoShowMessagesMaxDelay);
    }

    private queueEvent(event: SwrveEvent): void {
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
        const deviceProperties = queryDeviceProperties(this.platform, this.profileManager, this.installDate);
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
}

export interface IDependencies {
    campaignManager?: CampaignManager;
    eventManager?: EventManager;
    profileManager?: ProfileManager;
    restClient?: SwrveRestClient;
    platform?: IPlatform;
}
