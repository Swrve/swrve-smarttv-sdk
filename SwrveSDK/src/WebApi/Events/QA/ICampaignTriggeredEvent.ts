export default interface ICampaignTriggeredEvent {
    readonly type: "qa_log_event";
    readonly time: number;
    readonly seqnum: number;
    readonly log_type: "campaign-triggered";
    readonly log_source: "sdk";
    readonly log_details: {
        readonly event_name: string;
        readonly event_payload: any;
        readonly displayed: string;
        readonly reason: string;
        readonly campaigns: ReadonlyArray<{
            id: number;
            type: "iam";
            displayed: string;
            reason: string;
        }>;
    };
}
