// Samsung Smart TV AppCommon API declarations.
// See: https://developer.samsung.com/tv/develop/api-references/samsung-product-api-references/appcommon-api/

// The following things are documented at the URL above but not declared here
// because they don't appear to be used anywhere or really exist in the wild:
//  * AppCommonKeyName
//  * AppcommonTarget
//  * AppcommonAction
//  * AppCommonRecommendedWordsType
//  * AppCommonInputDeviceKey

// It doesn't make sense to apply the following rules to a declarations file.
/* tslint:disable:no-namespace interface-name*/

declare namespace webapis {
    namespace appcommon {
        namespace AppCommonScreenSaverState {
            const SCREEN_SAVER_OFF: 0;
            const SCREEN_SAVER_ON: 1;
        }

        function getVersion(): string;

        function setScreenSaver(state: AppCommonScreenSaverState,
                                onsuccess?: SuccessCallback | null,
                                onerror?: ErrorCallback | null): void;
    }

    type AppCommonScreenSaverState = typeof appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF
        | typeof appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON;
}
