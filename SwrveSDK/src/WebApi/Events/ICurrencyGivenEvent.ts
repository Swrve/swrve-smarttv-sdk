export default interface ICurrencyGivenEvent {
    readonly type: "currency_given";
    readonly seqnum: number;
    readonly time: number;
    readonly given_amount: number;
    readonly given_currency: string;
}
