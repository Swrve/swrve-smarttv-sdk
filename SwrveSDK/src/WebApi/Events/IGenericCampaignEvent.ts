import IDictionary from "../../utils/IDictionary";

export default interface IGenericCampaignEvent {
    readonly type: "generic_campaign_event";
    readonly time: number;
    readonly seqnum: number;
    readonly campaignType: string;
    readonly actionType: string;
    readonly id: string;
    readonly contextId: string;
    readonly payload: IDictionary<string>;
}
