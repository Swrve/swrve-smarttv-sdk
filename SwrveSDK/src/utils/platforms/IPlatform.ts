import { IKeyMapping } from "./IKeymapping";
import { IAsset } from "./IAsset";

export interface IPlatformName {
    readonly name: string;
    readonly variation: string;
}

export type DevicePropertyName = "language" | "countryCode" | "timezone" | "firmware" | "deviceHeight" | "deviceWidth";

export type NetworkStatus = number;

export type NetworkListener = (status: NetworkStatus) => void;

export type NetworkMonitorHandle = webOSDev.WebOSSubscriptionHandle | number | [() => void, () => void];

export const NETWORK_DISCONNECTED = 0;
export const NETWORK_CONNECTED = 1;

export interface IPlatform {
    readonly firmware: string;
    readonly deviceID: string;
    readonly model: string;
    readonly os: string;
    readonly osVersion: string;
    readonly language: string;
    readonly timezone: string;
    readonly countryCode: string;
    readonly region: string;
    readonly screenDPI: number;
    readonly screenHeight: number;
    readonly screenWidth: number;
    readonly appStore: string;
    [key: string]: any; //this is here simply to enable a test

    /**
     * Get the platform synchronous storage, usually browser localStorage.
     *
     * Custom implementations should return an object that conforms to the
     * Storage API.
     *
     * See: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
     */
    synchronousStorage: Storage | null;

    /**
     * Initialize the platform, should be called after DOM is rendered.
     * @param callback to be called once initialization is complete
     */
    init(deviceProperties: ReadonlyArray<DevicePropertyName>): Promise<void>;

    /**
     * Platform name.
     */
    name(): IPlatformName;

    /**
     * True if this platform needs a proxy for CORS requests.
     */
    getNeedsProxy(): boolean;

    /**
     * True if this platform supports a magic wand.
     */
    getSupportsMagicWandNatively(): boolean;

    /**
     * Disable the platform screen saver.
     */
    disableScreenSaver(): void;

    /**
     * Enable the platform screen saver.
     */
    enableScreenSaver(): void;

    /**
     * Exit the application.
     *
     * @param toMenu - True if the application should exit to menu, false if
     *                 it should exit to TV.
     */
    exit(toMenu?: boolean): void;

    /**
     * Get device browser version.
     */
    getDeviceBrowserVersion(): string | null;

    supportsHDR(): boolean;

    getKeymapping(): IKeyMapping;

    downloadAssets(assets: ReadonlyArray<IAsset>): Promise<void>;

    openLink(link: string): void;

    monitorNetwork(networkListener: NetworkListener): NetworkListener;

    stopMonitoringNetwork(networkListener: NetworkListener): void;
}
