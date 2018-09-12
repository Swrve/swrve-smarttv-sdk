export default interface IRestResponse<T> {
    readonly etag: string | null;
    readonly json: T;
}
