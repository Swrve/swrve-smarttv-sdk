import IDictionary from "../utils/IDictionary";
import { ISwrveCampaignResourceResponse } from "../Campaigns/ISwrveCampaign";
import { ProfileManager } from "../Profile/ProfileManager";
import { StorageManager } from "../Storage/StorageManager";
import { REAL_TIME_USER_PROPERTIES } from "../utils/SwrveConstants";

export class RealTimeUserPropertiesManager {
  private _profileManager: ProfileManager;
  private _realTimeUserProperties: IDictionary<string> = {};

  constructor(profileManager: ProfileManager) {
    this._profileManager = profileManager;
    this.loadStoredUserProperties();
  }

  public get UserProperties(): IDictionary<string> {
    return this._realTimeUserProperties;
  }

  public storeUserProperties(
    response: ISwrveCampaignResourceResponse,
    userId: string = this._profileManager.currentUser.userId,
  ): void {
    if (response && response.real_time_user_properties) {
      this._realTimeUserProperties = response.real_time_user_properties;
      StorageManager.saveData(
        `${REAL_TIME_USER_PROPERTIES}${userId}`,
        JSON.stringify(this._realTimeUserProperties),
      );
    }
  }

  public loadStoredUserProperties(
    userId: string = this._profileManager.currentUser.userId,
  ): void {
    this._realTimeUserProperties = {};

    const storedUserProperties = StorageManager.getData(
      `${REAL_TIME_USER_PROPERTIES}${userId}`,
    );
    if (storedUserProperties) {
      this._realTimeUserProperties = JSON.parse(storedUserProperties);
    }
  }

  public static processForPersonalization(rtups: IDictionary<string>): IDictionary<string> {
    const result: IDictionary<string> = {};
    const keysList = Object.keys(rtups);
    for (const entry of keysList) {
      result["user." + entry] = rtups[entry];
    }
    return result;
  }
}
