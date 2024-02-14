import { version } from "../../package.json";

export const sdkVersion = "SmartTV " + version;

export const SWRVE_DEVICE_NAME = "swrve.device_name";
export const SWRVE_OS = "swrve.os";
export const SWRVE_OS_VERSION = "swrve.os_version";
export const SWRVE_DEVICE_WIDTH = "swrve.device_width";
export const SWRVE_DEVICE_HEIGHT = "swrve.device_height";
export const SWRVE_DEVICE_DPI = "swrve.device_dpi";
export const SWRVE_LANGUAGE = "swrve.language";
export const SWRVE_UTC_OFFSET_SECONDS = "swrve.utc_offset_seconds";
export const SWRVE_TIMEZONE_NAME = "swrve.timezone_name";
export const SWRVE_SDK_VERSION = "swrve.sdk_version";
export const SWRVE_SDK_FLAVOUR = "swrve.sdk_flavour";
export const SWRVE_APP_STORE = "swrve.app_store";
export const SWRVE_INSTALL_DATE = "swrve.install_date";
export const SWRVE_DEVICE_REGION = "swrve.device_region";
export const SWRVE_COUNTRY_CODE = "swrve.country_code";
export const SWRVE_DEVICE_ID = "swrve.device_id";
export const SWRVE_USER_ID = "swrve.user_id";
export const SWRVE_CAMPAIGN_STATUS_UNSEEN = "unseen";
export const SWRVE_CAMPAIGN_STATUS_SEEN = "seen";
export const SWRVE_CAMPAIGN_STATUS_DELETED = "deleted";
export const SWRVE_AUTOSHOW_AT_SESSION_START_TRIGGER = "Swrve.Messages.showAtSessionStart";
export const SWRVE_DEVICE_TYPE = "swrve.device_type";

//button actions
export const DISMISS = "DISMISS";
export const CUSTOM = "CUSTOM";
export const SWRVE_IAM_CONTAINER = "SwrveIAMContainer";

//match to android values
export const GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS = 11;
export const GLOBAL_CAMPAIGN_THROTTLE_RECENT = 12;
export const GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME = 13;

export const CAMPAIGN_THROTTLE_RECENT = 0;
export const CAMPAIGN_THROTTLE_MAX_IMPRESSIONS = 1;
export const CAMPAIGN_THROTTLE_LAUNCH_TIME = 2;
export const CAMPAIGN_NOT_ACTIVE = 4;
export const CAMPAIGN_ERROR_INVALID_TRIGGERS = 5;
export const CAMPAIGN_NO_MATCH = 6;
export const CAMPAIGN_MATCH = 7;
export const CAMPAIGN_NOT_DOWNLOADED = 8;
export const CAMPAIGN_ELIGIBLE_BUT_OTHER_CHOSEN = 10;

export const CAMPAIGN_STATE = "campaignState.";
export const CAMPAIGNS = "campaigns.";
export const REAL_TIME_USER_PROPERTIES = "real_time_user_properties.";

//Identity
export const EXISTING_EXTERNAL_ID_MATCHES_SWRVE_ID = "existing_external_id_with_matching_swrve_id";
export const EXISTING_EXTERNAL_ID = "existing_external_id";
export const NEW_EXTERNAL_ID = "new_external_id";
export const IDENTIFY_CALL_PENDING = "identifyCallPending";
export const IDENTIFY_CALL_PENDING_EXTERNAL_ID = "identifyCallPendingExternalID";
export const CAMPAIGN_CALL_PENDING = "campaingCallPending";

//Errors that will be communicated to the developer
export const APP_ID_ERROR = "Error creating SDK.  The appId must be greater than 0.  "
    + "Your appId can be found in your Dashboard in the settings section.";
export const INVALID_FUNCTION = "Please pass a valid function to $.";
export const GET_INSTANCE_ERROR = "Please call SwrveSDK.getInstance() first.";
export const INVALID_EVENT_NAME = "Event name may not contain the word Swrve.";
export const NO_SYNCHRONOUS_STORAGE = "Local Storage is not available.";

export const IAM_CSS_CLASS_NAME = "swrve-iam";
export const DEFAULT_IAM_STYLE = `
        <style>
        .${IAM_CSS_CLASS_NAME} {
          position: fixed;
          left: 0;
          top: 0;
          height: 100vh;
          width: 100vw;
          z-index: 1050;
        }
    </style>
`;
