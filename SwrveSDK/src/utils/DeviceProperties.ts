import {
    SWRVE_APP_STORE,
    SWRVE_COUNTRY_CODE,
    SWRVE_DEVICE_DPI,
    SWRVE_DEVICE_HEIGHT,
    SWRVE_DEVICE_ID,
    SWRVE_DEVICE_REGION,
    SWRVE_DEVICE_WIDTH,
    SWRVE_INSTALL_DATE,
    SWRVE_LANGUAGE,
    SWRVE_OS,
    SWRVE_OS_VERSION,
    SWRVE_SDK_VERSION,
    SWRVE_TIMEZONE_NAME,
    sdkVersion,
    SWRVE_DEVICE_NAME,
    SWRVE_DEVICE_TYPE,
} from "./SwrveConstants";
import {ProfileManager} from "../Profile/ProfileManager";
import {IPlatform} from "./platforms/IPlatform";
import IDictionary from "./IDictionary";

export function queryDeviceProperties(platform: IPlatform, profileManager: ProfileManager, installDate: string):
    IDictionary<string | number> {
    const deviceProperties: IDictionary<string | number> = {
        [SWRVE_DEVICE_ID]: platform.deviceID,
        [SWRVE_OS]: platform.os,
        [SWRVE_OS_VERSION]: platform.osVersion,
        [SWRVE_SDK_VERSION]: sdkVersion,
        [SWRVE_LANGUAGE]: platform.language,
        [SWRVE_COUNTRY_CODE]: platform.countryCode,
        [SWRVE_DEVICE_REGION]: platform.region,
        [SWRVE_TIMEZONE_NAME]: platform.timezone,
        [SWRVE_DEVICE_DPI]: platform.screenDPI,
        [SWRVE_DEVICE_HEIGHT]: platform.screenHeight,
        [SWRVE_DEVICE_WIDTH]: platform.screenWidth,
        [SWRVE_DEVICE_NAME]: `${platform.name().variation} ${platform.model}`,
        [SWRVE_APP_STORE]: platform.appStore,
        [SWRVE_INSTALL_DATE]: installDate,
        [SWRVE_DEVICE_TYPE]: "tv",
    };

    return deviceProperties;
}
