export default interface IReward {
    readonly type: "item" | "currency";
    readonly amount: number;
}
