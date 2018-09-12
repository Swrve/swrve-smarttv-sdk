import IReadonlyDictionary from "../../utils/IReadonlyDictionary";

export default interface IDeviceUpdateEvent {
    readonly type: "device_update";
    readonly seqnum: number;
    readonly time: number;
    readonly attributes: IReadonlyDictionary<string | number >;
}
