export default interface ISessionStartEvent {
    readonly type: "session_start";
    readonly seqnum: number;
    readonly time: number;
}
