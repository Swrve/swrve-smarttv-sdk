import { APP_ID_ERROR } from "../utils/SwrveConstants";
import {ICSSStyle} from "./ISwrveConfig";

export type SwrveStack = "us" | "eu";

export interface ISwrveInternalConfig
{
    readonly appId: number;
    readonly apiKey: string;
    readonly appVersion?: string;
    readonly stack: SwrveStack;
    readonly httpsTimeoutSeconds: number;
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
}

export function validateConfig(config: ISwrveInternalConfig): void {
    if (config.appId <= 0) {
        throw new Error(APP_ID_ERROR);
    }
}
