import IReadonlyDictionary from "../../../utils/IReadonlyDictionary";
import IReward from "../IReward";

export default interface IQAIAPEvent {
    readonly log_source: "sdk";
    readonly log_details: {
        readonly type: "purchase",
        readonly parameters: {
            readonly product_id: string,
            readonly app_store: string,
            readonly rewards?: IReadonlyDictionary<IReward>;
            readonly cost: number;
            readonly local_currency: string;
        },
        readonly seqnum: number;
        readonly client_time: number;
    };
    readonly type: "qa_log_event";
    readonly time: number;
    readonly log_type: "event";
}
