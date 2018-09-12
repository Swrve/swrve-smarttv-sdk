import ICurrencyGivenEvent from "./ICurrencyGivenEvent";
import IIAPEvent from "./IIAPEvent";
import INamedEvent from "./INamedEvent";
import IPurchaseEvent from "./IPurchaseEvent";
import ISessionStartEvent from "./ISessionStartEvent";
import IUserUpdateEvent from "./IUserUpdateEvent";
import QAEvent from "./QA/QAEvent";
import IDeviceUpdateEvent from "./IDeviceUpdateEvent";

type SwrveEvent = QAEvent | ICurrencyGivenEvent | IIAPEvent | INamedEvent |
    IPurchaseEvent | ISessionStartEvent | IUserUpdateEvent | IDeviceUpdateEvent;

export default SwrveEvent;
