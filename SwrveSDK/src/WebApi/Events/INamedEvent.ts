import IDictionary from "../../utils/IDictionary";

export default interface INamedEvent {
    readonly type: "event";
    readonly seqnum: number;
    readonly time: number;
    readonly name: string;

    // “[A payload] is restricted to containing strings or integers”
    // https://docs.swrve.com/developer-documentation/api-guides/events-api-payloads-guide/
    readonly payload?: IDictionary<string | number>;
}
