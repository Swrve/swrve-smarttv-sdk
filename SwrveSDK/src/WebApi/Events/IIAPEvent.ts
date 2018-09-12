import IReadonlyDictionary from "../../utils/IReadonlyDictionary";
import IReward from "./IReward";

export default interface IIAPEvent {
    readonly type: "iap";
    readonly time: number;
    readonly seqnum: number;
    readonly quantity: number;
    readonly product_id: string;
    readonly app_store: string;
    readonly rewards?: IReadonlyDictionary<IReward>;
    readonly cost: number;
    readonly local_currency: string;
}
