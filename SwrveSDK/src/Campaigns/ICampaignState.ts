import {SWRVE_CAMPAIGN_STATUS_DELETED, SWRVE_CAMPAIGN_STATUS_SEEN, SWRVE_CAMPAIGN_STATUS_UNSEEN} from "../utils/SwrveConstants";

export interface ICampaignState{
    status: CampaignStatus;
    impressions: number;
    next: number;
    lastShownTime: number;
    [key: string]: string | number;
}

export type CampaignStatus = typeof SWRVE_CAMPAIGN_STATUS_UNSEEN |
    typeof SWRVE_CAMPAIGN_STATUS_SEEN |
    typeof SWRVE_CAMPAIGN_STATUS_DELETED;
