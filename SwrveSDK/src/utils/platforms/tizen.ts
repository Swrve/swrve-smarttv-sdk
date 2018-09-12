import BasePlatform from "./base";
import {
    IPlatformName, DevicePropertyName, NetworkMonitorHandle, NETWORK_DISCONNECTED, NETWORK_CONNECTED,
} from "./IPlatform";
import { IKeyMapping } from "./IKeymapping";
import SwrveLogger from "../SwrveLogger";

const tizenMapping = {
  38: "Up",
  40: "Down",
  37: "Left",
  39: "Right",
  13: "Enter",
  403: "ColorF0Red",
  404: "B",
  405: "C",
  406: "D",
  10009: "Back",
  415: "Play",
  417: "FastForward",
  412: "Rewind",
  413: "Stop",
  10252: "PlayPause",
  19: "Pause",
  65376: "Done",
  65385: "Cancel",
};

/**
 * Samsung platform
 */
export default class SamsungPlatform extends BasePlatform {
  constructor() {
    super();
    // this platform does not need a proxy.
    this.needsProxy = false;
  }

  public name(): IPlatformName {
    return {
      name: "Samsung",
      variation: "Tizen",
    };
  }

  public exit(toMenu: boolean = false): void {
    if (toMenu) {
      tizen.application.getCurrentApplication().hide();
    } else {
      tizen.application.getCurrentApplication().exit();
    }
  }

  public init(deviceProperties: ReadonlyArray<DevicePropertyName> = []): Promise<void> {
    super.init(deviceProperties);

    tizen.tvinputdevice.registerKey("0");
    tizen.tvinputdevice.registerKey("1");
    tizen.tvinputdevice.registerKey("2");
    tizen.tvinputdevice.registerKey("3");
    tizen.tvinputdevice.registerKey("4");
    tizen.tvinputdevice.registerKey("5");
    tizen.tvinputdevice.registerKey("6");
    tizen.tvinputdevice.registerKey("7");
    tizen.tvinputdevice.registerKey("8");
    tizen.tvinputdevice.registerKey("9");
    tizen.tvinputdevice.registerKey("MediaPlay");
    tizen.tvinputdevice.registerKey("MediaPause");
    tizen.tvinputdevice.registerKey("MediaFastForward");
    tizen.tvinputdevice.registerKey("MediaRewind");
    tizen.tvinputdevice.registerKey("MediaStop");
    tizen.tvinputdevice.registerKey("ColorF0Red");
    
    return deviceProperties
        .reduce((promise, property) => promise.then(() => this.getDeviceProperty(property)),
            Promise.resolve());
  }

  public disableScreenSaver(): void {
    if (typeof webapis !== "undefined") {
      webapis.appcommon.setScreenSaver(
        webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF,
      );
    } else {
      SwrveLogger.error(
        "Tizen TV webapis are not loaded can not disable screensaver",
      );
    }
  }

  public get firmware(): string {
    if (this._firmware === undefined) {
        this._firmware = webapis.productinfo.getFirmware();
    }
    return this._firmware || "";
  }

  public get model(): string {
    if (this._model === undefined) {
        this._model = webapis.productinfo.getRealModel();
    }
    return this._model || "";
  }

  public get os(): string {
    if (this._os === undefined) {
        this._os = tizen.systeminfo.getCapability("http://tizen.org/system/platform.name");
    }
    return this._os || "";
  }

  public get osVersion(): string {
    if (this._osVersion === undefined) {
        this._osVersion = tizen.systeminfo.getCapability("http://tizen.org/feature/platform.version");
    }
    return this._osVersion || "";
  }

  public get language(): string {
    return this._language || "";
  }

  public get countryCode(): string {
    return this._countryCode || "";
  }

  public get screenHeight(): number {
    if (this._screenHeight === undefined) {
        this._screenHeight = tizen.systeminfo.getCapability("http://tizen.org/feature/screen.height");
    }
    return this._screenHeight || 0;
  }

  public get screenWidth(): number {
    if (this._screenWidth === undefined) {
        this._screenWidth = tizen.systeminfo.getCapability("http://tizen.org/feature/screen.width");
    }
    return this._screenWidth || 0;
  }

  public get appStore(): string {
      return "tizen";
  }

  public openLink(link: string): void {
      const appControl = new tizen.ApplicationControl(
          "http://tizen.org/appcontrol/operation/view",
          link,
      );

      tizen.application.launchAppControl(
          appControl,
          null,
          () => { SwrveLogger.info("launch application control succeed"); },
          (e) => { SwrveLogger.error("launch application control failed. reason: " + e.message); },
      );
  }

  public getLanguage(): Promise<string> {
    if (this._language === undefined) {
        return this.loadLocale().then(() => this._language || "");
    }
    return Promise.resolve(this._language || "");
  }

  public getCountryCode(): Promise<string> {
    if (this._countryCode === undefined) {
        return this.loadLocale().then(() => this._countryCode || "");
    }
    return Promise.resolve(this._countryCode || "");
  }

  public getKeymapping(): IKeyMapping {
    return tizenMapping;
  }

  public supportsHDR(): boolean {
    return webapis.avinfo.isHdrTvSupport();
  }

  protected initNetworkListener(): NetworkMonitorHandle {
    return webapis.network.addNetworkStateChangeListener((value) => {
        if (value === webapis.network.NetworkState.GATEWAY_DISCONNECTED) {
            this.triggerNetworkChange(NETWORK_DISCONNECTED);
        } else if (value === webapis.network.NetworkState.GATEWAY_CONNECTED) {
            this.triggerNetworkChange(NETWORK_CONNECTED);
        }
    });
  }

  protected removeNetworkListener(handle: number): void {
      webapis.network.removeNetworkStateChangeListener(handle);
  }

  private getDeviceProperty(property: DevicePropertyName): Promise<any> | undefined {
    switch (property) {
        case "language":
            return this.getLanguage();
        case "countryCode":
            return this.getCountryCode();
        default:
            return undefined;
    }
  }

  private loadLocale(): Promise<any> {
    return new Promise((resolve, reject) =>
                 tizen.systeminfo.getPropertyValue('LOCALE', (result) => {
        this._language = result.language.split('_')[0];
        this._countryCode = result.country.replace(/\..*$/, '').split('_')[1].toLowerCase();
        resolve();
    }));
  }

}
