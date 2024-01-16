import {ISwrveInternalConfig, SwrveStack} from "./ISwrveInternalConfig";
import { ISwrveEmbeddedMessage } from "../Campaigns/ISwrveCampaign";
import IDictionary from "../utils/IDictionary";

export declare type OnEmbeddedMessageListener = (msg: ISwrveEmbeddedMessage, personalizationProperties?: IDictionary<string>) => void;
export declare type OnPersonalizationProvider = (eventPayload: IDictionary<string>) => IDictionary<string>;

export default interface ISwrveConfig {
    appId: number;
    apiKey: string;
    appVersion?: string;
    stack?: SwrveStack;
    newSessionInterval?: number;
    httpsTimeoutSeconds?: number;
    language?: string;
    contentUrl?: string;
    apiUrl?: string;
    identityUrl?: string;
    abTestDetailsEnabled?: boolean;
    autoShowMessagesMaxDelay?: number;
    inAppMessageButtonStyle?: ICSSStyle | string;
    inAppMessageButtonFocusStyle?: ICSSStyle | string;
    inAppMessageStyleOverride?: string;
    managedMode?: boolean;
    embeddedMessageConfig?: ISwrveEmbeddedMessageConfig;
    personalizationProvider?: OnPersonalizationProvider;

}

export interface ICSSStyle {
    [key: string]: string;
}

export function configWithDefaults(config: ISwrveConfig, lastUserId: string): ISwrveInternalConfig {
    return Object.freeze<ISwrveInternalConfig>({
        ...config,
        stack: config.stack || "us",
        httpsTimeoutSeconds: config.httpsTimeoutSeconds == null
            ? 60
            : config.httpsTimeoutSeconds,
        userId: lastUserId,
        language: config.language || "English",
        autoShowMessagesMaxDelay: config.autoShowMessagesMaxDelay == null
            ? 5000
            : config.autoShowMessagesMaxDelay,
        newSessionInterval: config.newSessionInterval == null
            ? 1800  /** 30 minutes in seconds */
            : config.newSessionInterval,
    });
}

export interface IPreviousConfig {
    userId?: string;
}

export interface ISwrveEmbeddedMessageConfig {
    embeddedCallback?: OnEmbeddedMessageListener;
  }
