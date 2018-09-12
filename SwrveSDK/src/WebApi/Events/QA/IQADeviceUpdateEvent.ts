import IDictionary from "../../../utils/IDictionary";

export default interface IQADeviceUpdateEvent {
    readonly log_source: "sdk";
    readonly log_details: {
        type: "device_update",
        parameters: {
            attributes: IDictionary<string | number | boolean>,
        },
        seqnum: number,
        client_time: number,
    };
    readonly type: "qa_log_event";
    readonly time: number;
    readonly log_type: "event";
}
