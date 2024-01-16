export default interface IButtonClickedEvent{
    type: "event";
    time: number;
    seqnum: number;
    name: string;
    payload:
    {
        name: string,
        embedded: string,
    };
}
