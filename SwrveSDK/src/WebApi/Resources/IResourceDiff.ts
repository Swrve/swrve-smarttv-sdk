import IReadonlyDictionary from "../../utils/IReadonlyDictionary";

export default interface IResourceDiff {
    readonly uid: string;
    readonly item_class: string;
    readonly diff: IReadonlyDictionary<{
        readonly old: string;
        readonly new: string;
    }>;
}
