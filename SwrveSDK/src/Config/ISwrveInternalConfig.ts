import { APP_ID_ERROR } from "../utils/SwrveConstants";
import { IKeyMapping } from "../utils/platforms/IKeymapping";
import { IPlatform, IPlatformName } from "../utils/platforms/IPlatform";
import {ICSSStyle, ISwrveEmbeddedMessageConfig, OnPersonalizationProvider, OnUserDisabledListener} from "./ISwrveConfig";

export type SwrveStack = "us" | "eu";

export interface ISwrveInternalConfig
{
    readonly appId: number;
    readonly apiKey: string;
    readonly appVersion?: string;
    readonly stack: SwrveStack;
    readonly httpsTimeoutSeconds: number;
    readonly newSessionInterval: number;
    readonly userId: string;
    readonly language: string;
    readonly contentUrl?: string;
    readonly apiUrl?: string;
    readonly identityUrl?: string;
    readonly abTestDetailsEnabled?: boolean;
    readonly autoShowMessagesMaxDelay?: number;
    readonly inAppMessageButtonStyle?: Readonly<ICSSStyle> | string;
    readonly inAppMessageButtonFocusStyle?: Readonly<ICSSStyle> | string;
    readonly inAppMessageStyleOverride?: string;
    readonly managedMode?: boolean;
    readonly autoStartLastUser?: boolean;
    readonly embeddedMessageConfig?: ISwrveEmbeddedMessageConfig;
    readonly personalizationProvider?: OnPersonalizationProvider;
    readonly userDisabledListener?: OnUserDisabledListener;
    readonly customPlatform?: IPlatform;
    readonly customKeyMappingTizen?: IKeyMapping;
    readonly customKeyMappingWebOS?: IKeyMapping;
    readonly customKeyMappingBase?: IKeyMapping;
    readonly customOSVersion?: string;
    readonly customOS?: string;
    readonly customDeviceName?: IPlatformName;
    readonly customAppStore?: string;
}

export function validateConfig(config: ISwrveInternalConfig): void {
    if (config.appId <= 0) {
        throw new Error(APP_ID_ERROR);
    }
}
