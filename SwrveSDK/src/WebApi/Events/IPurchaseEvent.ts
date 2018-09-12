export default interface IPurchaseEvent {
    readonly type: "purchase";
    readonly time: number;
    readonly seqnum: number;
    readonly quantity: number;
    readonly item: string;
    readonly cost: number;
    readonly currency: string;
}
