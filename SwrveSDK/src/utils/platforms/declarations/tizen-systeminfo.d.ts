// Tizen System Information API declarations.
// See: https://developer.tizen.org/dev-guide/4.0.0/org.tizen.web.apireference/html/device_api/tv/tizen/systeminfo.html

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace tizen {
    type SystemInfoPropertyId = keyof SystemInfoPropertyIdToType;

    interface SystemInfoPropertyIdToType {
        "BATTERY": SystemInfoBattery;
        "CPU": SystemInfoCpu;
        "STORAGE": SystemInfoStorage;
        "DISPLAY": SystemInfoDisplay;
        "DEVICE_ORIENTATION": SystemInfoDeviceOrientation;
        "BUILD": SystemInfoBuild;
        "LOCALE": SystemInfoLocale;
        "NETWORK": SystemInfoNetwork;
        "WIFI_NETWORK": SystemInfoWifiNetwork;
        "ETHERNET_NETWORK": SystemInfoEthernetNetwork;
        "CELLULAR_NETWORK": SystemInfoCellularNetwork;
        "NET_PROXY_NETWORK": SystemInfoNetProxyNetwork;
        "SIM": SystemInfoSIM;
        "PERIPHERAL": SystemInfoPeripheral;
        "MEMORY": SystemInfoMemory;
        "VIDEOSOURCE": SystemInfoVideoSource;
        "CAMERA_FLASH": SystemInfoCameraFlash;
        "ADS": SystemInfoADS;
    }

    type SystemInfoNetworkType = "NONE" | "2G" | "2.5G" | "3G" | "4G" | "WIFI" | "ETHERNET" | "NET_PROXY" | "UNKNOWN";

    type SystemInfoWifiSecurityMode = "NONE" | "WEP" | "WPA_PSK" | "WPA2_PSK" | "EAP";

    type SystemInfoWifiEncryptionType = "NONE" | "WEP" | "TKIP" | "AES" | "TKIP_AES_MIXED";

    type SystemInfoNetworkIpMode = "NONE" | "STATIC" | "DYNAMIC" | "AUTO" | "FIXED";

    type SystemInfoDeviceOrientationStatus = "PORTRAIT_PRIMARY" | "PORTRAIT_SECONDARY" | "LANDSCAPE_PRIMARY" | "LANDSCAPE_SECONDARY";

    type SystemInfoSimState =
        | "ABSENT"
        | "INITIALIZING"
        | "READY"
        | "PIN_REQUIRED"
        | "PUK_REQUIRED"
        | "NETWORK_LOCKED"
        | "SIM_LOCKED"
        | "UNKNOWN";

    type SystemInfoLowMemoryStatus = "NORMAL" | "WARNING";

    type SystemInfoVideoSourceType = "TV" | "AV" | "SVIDEO" | "COMP" | "PC" | "HDMI" | "SCART" | "DVI" | "MEDIA"    ;

    namespace systeminfo {
        function getTotalMemory(): number;

        function getAvailableMemory(): number;

        function getCapability(key: string): any;

        function getCount(property: SystemInfoPropertyId): number;

        function getPropertyValue<TPropertyId extends SystemInfoPropertyId>(
            property: TPropertyId,
            successCallback: SystemInfoPropertySuccessCallback<SystemInfoPropertyIdToType[TPropertyId]>,
            errorCallback?: ErrorCallback | null): void;

        function getPropertyValueArray<TPropertyId extends SystemInfoPropertyId>(
            property: TPropertyId,
            successCallback: SystemInfoPropertyArraySuccessCallback<SystemInfoPropertyIdToType[TPropertyId]>,
            errorCallback?: ErrorCallback | null): void;

        function addPropertyValueChangeListener<TPropertyId extends SystemInfoPropertyId>(
            property: TPropertyId,
            successCallback: SystemInfoPropertySuccessCallback<SystemInfoPropertyIdToType[TPropertyId]>,
            options?: SystemInfoOptions | null,
            errorCallback?: ErrorCallback | null): number;

        function removePropertyValueChangeListener(listenerId: number): void;
    }

    interface SystemInfoOptions {
        readonly timeout?: number;
        readonly highThreshold?: number;
        readonly lowThreshold?: number;
    }

    type SystemInfoPropertySuccessCallback<T extends SystemInfoProperty> = (property: T) => void;

    type SystemInfoPropertyArraySuccessCallback<T extends SystemInfoProperty> = (properties: T) => void;

    type SystemInfoProperty =
        | SystemInfoBattery
        | SystemInfoCpu
        | SystemInfoStorage
        | SystemInfoStorageUnit
        | SystemInfoDisplay
        | SystemInfoDeviceOrientation
        | SystemInfoBuild
        | SystemInfoLocale
        | SystemInfoNetwork
        | SystemInfoWifiNetwork
        | SystemInfoEthernetNetwork
        | SystemInfoCellularNetwork
        | SystemInfoNetProxyNetwork
        | SystemInfoSIM
        | SystemInfoPeripheral
        | SystemInfoMemory
        | SystemInfoVideoSource
        | SystemInfoCameraFlash
        | SystemInfoADS;

    interface SystemInfoBattery {
        readonly level: number;
        readonly isCharging: boolean;
        readonly timeToDischarge: number | null;
        readonly timeToFullCharge: number | null;
    }

    interface SystemInfoCpu {
        readonly load: number;
    }

    interface SystemInfoStorage {
        readonly units: ReadonlyArray<SystemInfoStorageUnit>;
    }

    interface SystemInfoStorageUnit {
        readonly type: string;
        readonly capacity: number;
        readonly availableCapacity: number;
        readonly isRemovable: boolean;
    }

    interface SystemInfoDisplay {
        readonly resolutionWidth: number;
        readonly resolutionHeight: number;
        readonly dotsPerInchWidth: number;
        readonly dotsPerInchHeight: number;
        readonly physicalWidth: number;
        readonly physicalHeight: number;
        readonly brightness: number;
    }

    interface SystemInfoDeviceOrientation {
        readonly status: SystemInfoDeviceOrientationStatus;
        readonly isAutoRotation: boolean;
    }

    interface SystemInfoBuild {
        readonly model: string;
        readonly manufacturer: string;
        readonly buildVersion: string;
    }

    interface SystemInfoLocale {
        readonly language: string;
        readonly country: string;
    }

    interface SystemInfoNetwork {
        readonly networkType: SystemInfoNetworkType;
    }

    interface SystemInfoWifiNetwork {
        readonly status: string;
        readonly ssid: string;
        readonly ipAddress: string;
        readonly ipv6Address: string;
        readonly macAddress: string;
        readonly signalStrength: number;
        readonly securityMode: SystemInfoWifiSecurityMode;
        readonly encryptionType: SystemInfoWifiEncryptionType;
        readonly ipMode: SystemInfoNetworkIpMode;
        readonly subnetMask: string;
        readonly gateway: string;
        readonly dns: string;
    }

    interface SystemInfoEthernetNetwork {
        readonly cable: string;
        readonly status: string;
        readonly ipAddress: string;
        readonly ipv6Address: string;
        readonly macAddress: string;
        readonly ipMode: SystemInfoNetworkIpMode;
        readonly subnetMask: string;
        readonly gateway: string;
        readonly dns: string;
    }

    interface SystemInfoCellularNetwork {
        readonly status: string;
        readonly apn: string;
        readonly ipAddress: string;
        readonly ipv6Address: string;
        readonly mcc: number;
        readonly mnc: number;
        readonly cellId: number;
        readonly lac: number;
        readonly isRoaming: boolean;
        readonly isFlightMode: boolean;
        readonly imei: string;
        readonly ipMode: SystemInfoNetworkIpMode;
        readonly subnetMask: string;
        readonly gateway: string;
        readonly dns: string;
    }

    interface SystemInfoNetProxyNetwork {
        readonly status: string;
    }

    interface SystemInfoSIM {
        readonly state: SystemInfoSimState;
        readonly operatorName: string;
        readonly msisdn: string;
        readonly iccid: string;
        readonly mcc: number;
        readonly mnc: number;
        readonly msin: string;
        readonly spn: string;
    }

    interface SystemInfoPeripheral {
        readonly isVideoOutputOn: boolean;
    }

    interface SystemInfoMemory {
        readonly status: SystemInfoLowMemoryStatus;
    }

    interface SystemInfoVideoSourceInfo {
        readonly  type: SystemInfoVideoSourceType;
        readonly number: number;
    }

    interface SystemInfoVideoSource {
        readonly connected: ReadonlyArray<SystemInfoVideoSourceInfo>;
        readonly  disconnected: ReadonlyArray<SystemInfoVideoSourceInfo>;
    }

    interface SystemInfoCameraFlash {
        readonly brightness: number;
        readonly camera: string;
        readonly levels: number;

        setBrightness(brightness: number): void;
    }

    interface SystemInfoADS {
        readonly id: string;
    }
}
