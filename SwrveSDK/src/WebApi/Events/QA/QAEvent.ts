import ICampaignsDownloadedEvent from "./ICampaignsDownloadedEvent";
import ICampaignTriggeredEvent from "./ICampaignTriggeredEvent";
import IQANamedEvent from "./IQANamedEvent";
import IQAUserUpdateEvent from "./IQAUserUpdateEvent";
import IQASessionStartEvent from "./IQASessionStartEvent";
import IQAPurchaseEvent from "./IQAPurchaseEvent";
import IQAIAPEvent from "./IQAIAPEvent";
import IQACurrencyGivenEvent from "./IQACurrencyGivenEvent";
import IQAButtonClickedEvent from "./IQAButtonClickedEvent";
import IQADeviceUpdateEvent from "./IQADeviceUpdateEvent";

type QAEvent = ICampaignsDownloadedEvent | ICampaignTriggeredEvent
    | IQANamedEvent | IQAUserUpdateEvent | IQAButtonClickedEvent
    | IQASessionStartEvent | IQAPurchaseEvent | IQAIAPEvent
    | IQACurrencyGivenEvent | IQADeviceUpdateEvent;

export default QAEvent;
