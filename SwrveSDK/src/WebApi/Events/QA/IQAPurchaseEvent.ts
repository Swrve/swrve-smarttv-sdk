export default interface IQAPurchaseEvent{
    readonly log_source: "sdk";
    readonly log_details: {
        readonly type: "purchase",
        readonly parameters: {
            readonly quantity: number,
            readonly item: string,
            readonly cost: number,
            readonly currency: string,
        },
        readonly seqnum: number,
        readonly client_time: number,
    };
    readonly type: "qa_log_event";
    readonly time: number;
    readonly log_type: "event";
}
