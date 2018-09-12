import IDictionary from "../../../utils/IDictionary";

export default interface IQANamedEvent {
    readonly log_source: "sdk";
    readonly log_details: {
        readonly type: "event";
        readonly parameters: {
            readonly name: string;
            readonly payload?: IDictionary<string|number>;
        },
        readonly seqnum: number;
        readonly client_time: number;
    };
    readonly type: "qa_log_event";
    readonly time: number;
    readonly log_type: "event";
}
