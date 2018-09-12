import {
    IPlatform, IPlatformName, DevicePropertyName, NetworkListener, NetworkMonitorHandle,
    NETWORK_CONNECTED, NETWORK_DISCONNECTED, NetworkStatus,
} from "./IPlatform";
import {generateUuid} from '../uuid';
import {IKeyMapping } from "./IKeymapping";
import SwrveLogger from "../SwrveLogger";
import {IAsset} from "./IAsset";

const defaultMapping: IKeyMapping = {
  36: "Return",
  38: "Up",
  40: "Down",
  37: "Left",
  39: "Right",
  13: "Enter",
  65: "A",
  66: "B",
  67: "C",
  68: "D",
  8: "Back",
  179: "Play",
  227: "FastForward",
  228: "Rewind",
  112: "F1",
};

const protectedKeyPrefix = /^swrve\./;
export function clearLocalStorage(force: boolean = false): void {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && force) {
            keys.push(key);
        } else if (key && !protectedKeyPrefix.test(key)) {
            keys.push(key);
        }
    }
    keys.forEach(key => localStorage.removeItem(key!));
}

if (typeof window !== "undefined" && window.localStorage && window.localStorage.clear !== clearLocalStorage) {
    window.localStorage.clear = clearLocalStorage;
}

/**
 * Base Platform (also the browser platform)
 */
export default class BasePlatform implements IPlatform {
  /** True if the platform needs a proxy. */
  protected needsProxy: boolean = true;

  /** True if this platform supports the magic wand. */
  protected supportsMagicWandNatively: boolean = false;

  /** Number of history entries on start. */
  protected startHistoryLength: number = 0;

  protected _firmware: string | undefined;
  protected _deviceID: string | undefined;
  protected _model: string | undefined;
  protected _os: string | undefined;
  protected _osVersion: string | undefined;
  protected _language: string | undefined;
  protected _countryCode: string | undefined;
  protected _screenDPI: number | undefined;
  protected _screenHeight: number | undefined;
  protected _screenWidth: number | undefined;
  protected _timezone: string | undefined;
  protected _region: string | undefined;
  protected networkMonitorHandle?: NetworkMonitorHandle;
  protected networkListeners: NetworkListener[] = [];

  public name(): IPlatformName {
    return {
      name: "Browser",
      variation: "Base",
    };
  }

  public init(deviceProperties: ReadonlyArray<DevicePropertyName>): Promise<void> {
    if (typeof window !== "undefined") {
      this.startHistoryLength = window.history.length;
    }

    const cache = document.createElement("div");
    cache.id = "PALImageCache";
    cache.style.overflow = "hidden";
    cache.style.position = "absolute";
    cache.style.left = "-10000px";
    cache.style.width = "1px";
    cache.style.height = "1px";

    if (document.getElementById("PALImageCache") === null) {
        document.body.appendChild(cache);
    }

    SwrveLogger.info("PAL init");

    return Promise.resolve();
  }

  public monitorNetwork(networkListener: NetworkListener): NetworkListener {
    if (this.networkMonitorHandle === undefined) {
        this.networkMonitorHandle = this.initNetworkListener();
    }
    this.networkListeners.push(networkListener);
    return networkListener;
  }

  public stopMonitoringNetwork(networkListener: NetworkListener): void {
    this.networkListeners = this.networkListeners.filter(listener => listener !== networkListener);
    if (this.networkListeners.length === 0 && this.networkMonitorHandle !== undefined) {
        this.removeNetworkListener(this.networkMonitorHandle);
        delete this.networkMonitorHandle;
    }
  }

  public getNeedsProxy(): boolean {
    return this.needsProxy;
  }

  public getSupportsMagicWandNatively(): boolean {
    return this.supportsMagicWandNatively;
  }

  public disableScreenSaver(): void {
    SwrveLogger.error("platform does not know how to disable screensaver");
  }

  public openLink(link: string): void {
      if (typeof window !== "undefined") {
        window.open(link);
      }
  }

  public enableScreenSaver(): void {
    SwrveLogger.error("platform does not know how to enable screensaver");
  }

  public get synchronousStorage(): Storage | null {
    if (typeof window !== "undefined") {
      return window.localStorage;
    } else {
      return null;
    }
  }

  public downloadAssets(assets: ReadonlyArray<IAsset>): Promise<void> {
      const downloading = assets.map((asset) => {
          const img = document.createElement("img");
          img.src = asset.path;

          SwrveLogger.info("PAL download " + asset.path);

          const imageCache = document.getElementById("PALImageCache");
          if (imageCache) {
              imageCache.appendChild(img);
          } else {
              SwrveLogger.info(" PAL: Image cache does not exist");
          }

          return new Promise<void>( (resolve, reject) => {
             img.addEventListener("load", () => {
                 resolve();
             });
             img.addEventListener("error", () => {
                 reject();
             });
          });
      });

      return Promise.all(downloading)
          .then(() => void 0);
  }

  public exit(): void {
    const backlength = window.history.length - this.startHistoryLength - 1;
    window.history.go(-backlength);
  }

  public get deviceID(): string {
    const localStorage = this.synchronousStorage;
    if (localStorage) {
      let saved = localStorage.getItem("swrve.deviceid");
      if (!saved) {
        saved = generateUuid().toString();
        localStorage.setItem("swrve.deviceid", saved);
      }
      return saved;
    } else {
      return "";
    }
  }

  public get firmware(): string {
      return 'Not Supported';
  }

  public get timezone(): string {
    if (this._timezone === undefined) {
        this._timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return this._timezone || "";
  }

  public get region(): string {
    if (this._region === undefined) {
        this._region = this.timezone.indexOf('/') !== -1 ? this.timezone.split('/')[0] : "";
    }
    return this._region || "";
  }

  public getDeviceBrowserVersion(): string | null {
    const match = navigator == null || navigator.appVersion == null
          ? null
          : navigator.appVersion.match(/^[^\s]*/);

    return match == null
           ? null
           : match[0];
  }

  public get model(): string {
    return "";
  }

  public get os(): string {
    return navigator.platform;
  }

  public get osVersion(): string {
      const match = navigator.userAgent.match(/[^\s]+$/);
      return match ? match[0] : "Unknown version";
  }

  public get appStore(): string {
    return "google";
  }

  public get language(): string {
    if (this._language === undefined && typeof navigator !== "undefined") {
        this._language = navigator.language.split('-')[0];
    }
    return this._language || "";
  }

  public get countryCode(): string {
    if (this._countryCode === undefined && typeof navigator !== "undefined") {
        this._countryCode = navigator.language.split('-')[1];
    }
    return this._countryCode || "";
  }

  public get screenDPI(): number {
    if (this._screenDPI === undefined) {
        this._screenDPI = calculatePPI(this.screenWidth, this.screenHeight, detectScreenDiagonal(this.model));
    }

    return this._screenDPI;
  }

  public get screenHeight(): number {
      if (this._screenHeight === undefined) {
          this._screenHeight = typeof navigator !== "undefined" ? screen.height : 0;
      }
      return this._screenHeight || 0;
  }

  public get screenWidth(): number {
    if (this._screenWidth === undefined) {
        this._screenWidth = typeof navigator !== "undefined" ? screen.width : 0;
    }
    return this._screenWidth || 0;
  }

  public supportsHDR(): boolean {
    return false;
  }

  public getKeymapping(): IKeyMapping {
    return defaultMapping;
  }

  protected triggerNetworkChange(status: NetworkStatus): void {
    this.networkListeners.forEach(listener => listener(status));
  }

  protected initNetworkListener(): NetworkMonitorHandle {
    const onOnline = () => this.triggerNetworkChange(NETWORK_CONNECTED);
    const onOffline = () => this.triggerNetworkChange(NETWORK_DISCONNECTED);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return [onOnline, onOffline];
  }

  protected removeNetworkListener(handle: NetworkMonitorHandle): void {
    const [onOnline, onOffline] = <[() => void, () => void]> handle;
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
 }
}

// First numeric part of Samsung and LG model names indicates screen size in inches
export function detectScreenDiagonal(modelName: string): number {
    let size;
    const match = modelName.match(/\d+/);
    if (match) {
        size = parseInt(match[0], 10);
    }

    // fallback to median screen size on the market
    return size || 50;
}

export function calculatePPI(pixelWidth: number, pixelHeight: number, inchDiagonal: number): number {
    const pixelDiagonal = Math.sqrt((pixelWidth * pixelWidth) + (pixelHeight * pixelHeight));
    return Math.round(pixelDiagonal / inchDiagonal);
}
