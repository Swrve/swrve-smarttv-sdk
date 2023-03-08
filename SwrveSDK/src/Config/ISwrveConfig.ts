import {ISwrveInternalConfig, SwrveStack} from "./ISwrveInternalConfig";
import {generateUuid} from "../utils/uuid";

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
}

export interface ICSSStyle {
    [key: string]: string;
}

export function configWithDefaults(config: ISwrveConfig, previousConfig: IPreviousConfig = {}): ISwrveInternalConfig {
    return Object.freeze<ISwrveInternalConfig>({
        ...config,
        stack: config.stack || "us",
        httpsTimeoutSeconds: config.httpsTimeoutSeconds == null
            ? 60
            : config.httpsTimeoutSeconds,
        userId: previousConfig.userId || generateUuid().toString(),
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
