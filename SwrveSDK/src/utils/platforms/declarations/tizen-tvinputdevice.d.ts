// Tizen TV Input Device API declarations.
// See: https://developer.tizen.org/dev-guide/4.0.0/org.tizen.web.apireference/html/device_api/tv/tizen/tvinputdevice.html

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace tizen {
    type InputDeviceKeyName = string;

    namespace tvinputdevice {
        function getSupportedKeys(): InputDeviceKey[];

        function getKey(keyName: InputDeviceKeyName): InputDeviceKey | null;

        function registerKey(keyName: InputDeviceKeyName): void;

        function unregisterKey(keyName: InputDeviceKeyName): void;

        function registerKeyBatch(keyNames: ReadonlyArray<InputDeviceKeyName>,
                                  successCallback?: SuccessCallback | null,
                                  errorCallback?: ErrorCallback | null): void;

        function unregisterKeyBatch(keyNames: ReadonlyArray<InputDeviceKeyName>,
                                    successCallback?: SuccessCallback | null,
                                    errorCallback?: ErrorCallback | null): void;
    }

    interface InputDeviceKey {
        readonly name: InputDeviceKeyName;
        readonly code: number;
    }
}
