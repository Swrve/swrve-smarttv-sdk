export default interface IQAButtonClickedEvent {
    readonly type: "qa_log_event";
    readonly seqnum: number;
    readonly time: number;
    readonly log_type: "campaign-button-clicked";
    readonly log_source: "sdk";
    readonly log_details: {
        readonly campaign_id: number;
        readonly variant_id: number;
        readonly button_name: string;
        readonly action_type: string;
        readonly action_value: string;
    };
}
