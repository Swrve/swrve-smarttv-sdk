export default interface IQAGenericCampaignEvent {
    readonly time: number;
    readonly type: "qa_log_event";
    readonly log_source: "sdk";
    readonly log_type: "event";
    readonly log_details: {
        readonly type: "generic_campaign_event";
        readonly seqnum: number;
        readonly client_time: number;
        readonly payload: string;
        readonly parameters: {
            readonly campaignType: string;
            readonly actionType: string;
            readonly id: string;
            readonly contextId: string;
        };
    };
}
