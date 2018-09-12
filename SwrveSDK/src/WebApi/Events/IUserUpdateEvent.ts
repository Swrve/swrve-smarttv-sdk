import IReadonlyDictionary from "../../utils/IReadonlyDictionary";

export default interface IUserUpdateEvent {
    readonly type: "user";
    readonly seqnum: number;
    readonly time: number;
    readonly attributes: IReadonlyDictionary<string | number | boolean>;
}
