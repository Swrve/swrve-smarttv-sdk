import { ICampaignDownloadData } from "../../../Events/EventTypeInterfaces";

export default interface ICampaignsDownloadedEvent {
    readonly log_source: string;
    readonly log_details: {
        readonly campaigns?: ReadonlyArray<ICampaignDownloadData>;
    };
    readonly seqnum: number;
    readonly type: "qa_log_event";
    readonly time: number;
    readonly log_type: "campaigns-downloaded";
}
