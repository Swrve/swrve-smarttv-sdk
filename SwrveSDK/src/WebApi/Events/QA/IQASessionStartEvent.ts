export default interface IQASessionStartEvent {
    readonly log_source: "sdk";
    readonly log_details: {
        readonly type: "session_start";
        readonly parameters: {};
        readonly seqnum: number;
        readonly client_time: number;
    };
    readonly type: "qa_log_event";
    readonly time: number;
    readonly log_type: "event";
}
