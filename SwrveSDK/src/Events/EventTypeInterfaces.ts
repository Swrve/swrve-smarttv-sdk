export interface ICampaignDownloadData{
    id: number;
    variant_id: number;
    type: string;
}

export interface IQATriggerReport{
    event_name: string;
    event_payload: any;
    displayed: string;
    reason: string;
    campaigns: IQACampaignTriggerEvent[];
}

export interface IQACampaignTriggerEvent{
    id: number;
    displayed: string;
    type: "iam";
    reason: string;
}
