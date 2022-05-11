import {SwrveInternal} from './SwrveInternal';
import {ResourceManager} from './Resources/ResourceManager';
import {ISwrveCampaign, ISwrveMessage, IUserResource} from './Campaigns/ISwrveCampaign';
import {IUserInfo} from './Profile/IUser';
import ISwrveConfig from "./Config/ISwrveConfig";
import IDictionary from "./utils/IDictionary";
import IReadonlyDictionary from "./utils/IReadonlyDictionary";
import { sdkVersion, GET_INSTANCE_ERROR } from './utils/SwrveConstants';
import IReward from "./WebApi/Events/IReward";

let swrveInternal: SwrveInternal | null = null;

export type OnResourcesLoadedCallback = (resources: ReadonlyArray<IUserResource> | null) => void;
export type OnCampaignLoadedCallback = () => void;
export type GetResourcesCallback = (resources: ReadonlyArray<IUserResource>) => void;
export type GetUserResourcesDiffCallback = (oldDictionary: IDictionary<IUserResource>,
                                            newDictionary: IDictionary<IUserResource>,
                                            json: any) => any;
export type OnIdentifyErrorCallback = (error: string) => void;
export type OnMessageListener = (msg: ISwrveMessage) => void;
export type OnIAMDismissed = () => void;
export type OnCustomButtonClicked = (customString: string) => void;

export class SwrveSDK {
    private static _instance: SwrveSDK|null = null;

    public static createInstance(config: ISwrveConfig): SwrveSDK {
        if (SwrveSDK._instance) {
            return SwrveSDK._instance;
        } else {
            SwrveSDK._instance = new SwrveSDK(config);
            SwrveSDK._instance.init();

            return SwrveSDK._instance;
        }
    }

    private constructor(config: ISwrveConfig) {
        swrveInternal = new SwrveInternal(config);
    }

    public init(): void {
        SwrveSDK.checkInstance().init();
    }

    private static checkInstance(): SwrveInternal {
        if (swrveInternal == null) {
            throw Error(GET_INSTANCE_ERROR);
        }

        return swrveInternal;
    }

    //******************************** Callbacks ****************************************************//

    public static onResourcesLoaded(callback: OnResourcesLoadedCallback): void {
        SwrveSDK.checkInstance().onResourcesLoaded(callback);
    }

    public static onCampaignLoaded(callback: OnCampaignLoadedCallback): void {
        SwrveSDK.checkInstance().onCampaignLoaded(callback);
    }

    public static onMessage(callback: OnMessageListener): void {
        SwrveSDK.checkInstance().onMessage(callback);
    }

    public static getResources(callback: GetResourcesCallback): void {
        SwrveSDK.checkInstance().getResources(callback);
    }

    public static getUserResourcesDiff(callback: GetUserResourcesDiffCallback): void {
        SwrveSDK.checkInstance().getUserResourcesDiff(callback);
    }

    public static onIAMDismissed(callback: OnIAMDismissed): void {
        SwrveSDK.checkInstance().onIAMDismissed(callback);
    }

    public static onCustomButtonClicked(callback: OnCustomButtonClicked): void {
        SwrveSDK.checkInstance().onCustomButtonClicked(callback);
    }

    //******************************** Accessor methods *********************************************//

    public static getConfig(): Readonly<ISwrveConfig> {
        return SwrveSDK.checkInstance().getConfig();
    }

    public static getInstance(): SwrveSDK {
        if (SwrveSDK._instance == null) {
            throw new Error(GET_INSTANCE_ERROR);
        }

        return SwrveSDK._instance;
    }

    public static getResourceManager(): ResourceManager {
        return SwrveSDK.checkInstance().getResourceManager();
    }

    public static getUserInfo(): IUserInfo {
        return SwrveSDK.checkInstance().getUserInfo();
    }

    public static getMessageCenterCampaigns(): ISwrveCampaign[] {
        return SwrveSDK.checkInstance().getMessageCenterCampaigns();
    }

    public static getSDKVersion(): string {
        return sdkVersion;
    }

    //*************************************** Event Management ************************************//

    public static sendEvent(name: string, payload: IDictionary<string|number> = {}): void {
        SwrveSDK.checkInstance().sendEvent(name, payload);
    }

    public static sendUserUpdateWithDate(keyName: string, date: Date): void {
        SwrveSDK.checkInstance().sendUserUpdateWithDate(keyName, date);
    }

    public static sendUserUpdate(attributes: IReadonlyDictionary<string | number | boolean>): void {
        SwrveSDK.checkInstance().sendUserUpdate(attributes);
    }

    public static sendPurchaseEvent(name: string, currency: string, cost: number, quantity: number): void {
        SwrveSDK.checkInstance().sendPurchaseEvent(name, currency, cost, quantity);
    }

    public static sendInAppPurchaseWithoutReceipt(quantity: number, productId: string, productPrice: number,
                                                  currency: string, rewards: IReadonlyDictionary<IReward>): void {
        SwrveSDK.checkInstance().sendInAppPurchaseWithoutReceipt(quantity, productId, productPrice, currency, rewards);
    }

    public static sendCurrencyGiven(currencyGiven: string, amount: number): void {
        SwrveSDK.checkInstance().sendCurrencyGiven(currencyGiven, amount);
    }

    public static sendQueuedEvents(): void {
        SwrveSDK.checkInstance().sendQueuedEvents();
    }

    //*************************************** Lifecycle Management ************************************//

    public static start(userId?: string): void {
        SwrveSDK.checkInstance().start(userId);
    }

    public static isStarted(): boolean {
       return SwrveSDK.checkInstance().isSDKStarted();
    }

    public static shutdown(): void {
        SwrveSDK.checkInstance().shutdown();

        swrveInternal = null;
        SwrveSDK._instance = null;
    }

    public static stop(): void {
        SwrveSDK.checkInstance().stop();
    }

    //*************************************** Other ************************************//

    public static identify(thirdPartyLoginId: string, onIdentifyError: OnIdentifyErrorCallback): void {
        SwrveSDK.checkInstance().identify(thirdPartyLoginId, onIdentifyError);
    }

    public static saveToStorage(): void {
        SwrveSDK.checkInstance().saveToStorage();
    }

    public static showCampaign(campaign: ISwrveCampaign): boolean {
        return SwrveSDK.checkInstance().showCampaign(campaign);
    }
}
