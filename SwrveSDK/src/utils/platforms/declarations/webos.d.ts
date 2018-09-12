// https://webostv.developer.lge.com/api/webostvjs/webos/

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webOS {
    interface SystemInfo {
        country: string;
        smartServiceCountry: string;
        timezone: string;
    }

    interface SystemTimeInfo {
        timezone: string;
    }

    interface SystemProperties {
        modelName: string;
        firmwareVersion: string;
    }

    function platformBack(): void;
    function systemInfo(): SystemInfo;

    namespace service {
        function request(uri: string, params: {}): void;
    }
}

declare const PalmSystem: {
    deviceInfo: string,
};
