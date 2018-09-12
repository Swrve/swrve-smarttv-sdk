import {ICampaignDownloadData, IQATriggerReport, IQACampaignTriggerEvent} from "./EventTypeInterfaces";
import {ISwrveMessage} from "../Campaigns/ISwrveCampaign";
import ICampaignsDownloadedEvent from "../WebApi/Events/QA/ICampaignsDownloadedEvent";
import ICampaignTriggeredEvent from "../WebApi/Events/QA/ICampaignTriggeredEvent";
import IQAPurchaseEvent from "../WebApi/Events/QA/IQAPurchaseEvent";
import IQASessionStartEvent from "../WebApi/Events/QA/IQASessionStartEvent";
import ISessionStartEvent from "../WebApi/Events/ISessionStartEvent";
import INamedEvent from "../WebApi/Events/INamedEvent";
import IDictionary from "../utils/IDictionary";
import IUserUpdateEvent from "../WebApi/Events/IUserUpdateEvent";
import IDeviceUpdateEvent from "../WebApi/Events/IDeviceUpdateEvent";
import IQADeviceUpdateEvent from "../WebApi/Events/QA/IQADeviceUpdateEvent";
import IReadonlyDictionary from "../utils/IReadonlyDictionary";
import IPurchaseEvent from "../WebApi/Events/IPurchaseEvent";
import IIAPEvent from "../WebApi/Events/IIAPEvent";
import IReward from "../WebApi/Events/IReward";
import ICurrencyGivenEvent from "../WebApi/Events/ICurrencyGivenEvent";
import IQANamedEvent from "../WebApi/Events/QA/IQANamedEvent";
import IQAUserUpdateEvent from "../WebApi/Events/QA/IQAUserUpdateEvent";
import {validateRewards} from "./EventValidators";
import IQAIAPEvent from "../WebApi/Events/QA/IQAIAPEvent";
import IQACurrencyGivenEvent from "../WebApi/Events/QA/IQACurrencyGivenEvent";
import IButtonClickedEvent from "../WebApi/Events/IButtonClickedEvent";
import IQAButtonClickedEvent from "../WebApi/Events/QA/IQAButtonClickedEvent";
import { getISOString } from "../utils/TimeHelper";

export class EventFactory {
    /************************ Named Event ***********************************************************/
    public getNamedEvent(name: string,
                         payload: IDictionary<string|number>,
                         seqnum: number,
                         time: number): INamedEvent {
        return {type: "event", time, seqnum, name, payload};
    }

    public getWrappedNamedEvent(event: INamedEvent): IQANamedEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "event",
                parameters: {
                    name: event.name,
                    payload: event.payload,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ User Update with Date Event ***********************************************************/

    public getUserUpdateWithDate(keyName: string, date: Date, seqnum: number, time: number): IUserUpdateEvent {
        return {
            type: "user",
            time,
            seqnum,
            attributes: {
                [keyName]: getISOString(date),
            },
        };
    }

    public getWrappedUserUpdateWithDate(event: IUserUpdateEvent): IQAUserUpdateEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "user",
                parameters: {
                    attributes: event.attributes,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ User Update Event ***********************************************************/

    public getUserUpdate(attributes: IReadonlyDictionary<string | number | boolean>,
                         seqnum: number, time: number): IUserUpdateEvent {
            return {
                type: "user",
                time,
                seqnum,
                attributes,
            };
    }

    public getWrappedUserUpdate(event: IUserUpdateEvent): IQAUserUpdateEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "user",
                parameters: {
                    attributes: event.attributes,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ Device Update Event ***********************************************************/

    public getDeviceUpdate(attributes: IReadonlyDictionary<string | number>,
                           seqnum: number, time: number): IDeviceUpdateEvent {
        return {
            type: "device_update",
            time,
            seqnum,
            attributes,
        };
    }

    public getWrappedDeviceUpdate(event: IDeviceUpdateEvent): IQADeviceUpdateEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "device_update",
                parameters: {
                    attributes: event.attributes,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ Purchase Event ***********************************************************/

    public getPurchaseEvent(keyName: string, currency: string, cost: number, quantity: number,
                            seqnum: number, time: number): IPurchaseEvent {
        return {
            type: "purchase",
            time,
            seqnum,
            quantity,
            item: keyName,
            cost,
            currency,
        };
    }

    public getWrappedPurchaseEvent(event: IPurchaseEvent): IQAPurchaseEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "purchase",
                parameters: {
                    quantity: event.quantity,
                    item: event.item,
                    cost: event.cost,
                    currency: event.currency,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ InAppPurchaseEventWithoutReceipt ***********************************************************/

    public getInAppPurchaseEventWithoutReceipt(quantity: number,
                                               productId: string,
                                               productPrice: number,
                                               currency: string,
                                               seqnum: number,
                                               time: number,
                                               rewards?: IReadonlyDictionary<IReward>): IIAPEvent {
        if (rewards != null) {
            validateRewards(rewards);
        }

        return {
            type: "iap",
            time,
            seqnum,
            quantity,
            product_id: productId,
            // Using a store based on platform, e.g. this.platform.appStore, triggers a receipt check on the backend.
            // We are using "unknown_store" to avoid the backend check because the OTT SDK does not support IAPs with receipts.
            app_store: "unknown_store",
            cost: productPrice,
            local_currency: currency,
            rewards,
        };
    }

    public getWrappedInAppPurchaseEventWithoutReceipt(event: IIAPEvent): IQAIAPEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "purchase",
                parameters: {
                    product_id: event.product_id,
                    app_store: event.app_store,
                    rewards: event.rewards,
                    cost: event.cost,
                    local_currency: event.local_currency,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ Session Start Event ***********************************************************/

    public getStartSessionEvent(seqnum: number, time: number): ISessionStartEvent {
        return {
            type: "session_start",
            time,
            seqnum,
        };
    }

    public getWrappedSessionStart(event: ISessionStartEvent): IQASessionStartEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "session_start",
                parameters: {},
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ Currency Given Event ***********************************************************/

    public getCurrencyGivenEvent(given_currency: string, given_amount: number, seqnum: number, time: number): ICurrencyGivenEvent {
        return {type: "currency_given", time, seqnum, given_amount, given_currency};
    }

    public getWrappedCurrencyGivenEvent(event: ICurrencyGivenEvent): IQACurrencyGivenEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "currency_given",
                parameters: {
                    given_amount: event.given_amount,
                    given_currency: event.given_currency,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ First Install Event ***********************************************************/

    public getFirstInstallEvent(installDate: number, seqnum: number): INamedEvent {
        return {type: "event", time: installDate, seqnum, name: "Swrve.first_session"};
    }

    public getWrappedFirstInstallEvent(event: INamedEvent): IQANamedEvent {
        return {
            log_source: "sdk",
            log_details: {
                type: "event",
                parameters: {
                    name: event.name,
                },
                seqnum: event.seqnum,
                client_time: event.time,
            },
            type: "qa_log_event",
            time: event.time,
            log_type: "event",
        };
    }

    /************************ Button Click Event ***********************************************************/

    public getButtonClickEvent(seqnum: number, name: string): IButtonClickedEvent {
        return {
            type: "event",
            time: Date.now(),
            seqnum,
            name: "Swrve.Messages.Message-30251.click",
            payload: {
                name,
            },
        };
    }

    public getQAButtonClickEvent(campaign_id: number, variant_id: number, button_name: string, action_type: string,
                                 action_value: string, seqnum: number): IQAButtonClickedEvent {
        return {
            type: "qa_log_event",
            log_type: "campaign-button-clicked",
            seqnum,
            time: Date.now(),
            log_source: "sdk",
            log_details: {
                campaign_id,
                variant_id,
                button_name,
                action_type,
                action_value,
            },
        };
    }

    /************************ QA Only Events ***********************************************************/

    public getImpressionEvent(message: ISwrveMessage, seqnum: number): INamedEvent {
        const format = message.template.formats[0];
        const size = format.size.w + "x" + format.size.h;

        return {
            type: "event",
            time: Date.now(),
            seqnum,
            name: "Swrve.Messages.Message-" + message.id + ".impression",
            payload: {
                orientation: format.orientation,
                size,
                format: format.name,
            },
        };
    }

    public getCampaignsDownloadedEvent(seqnum: number,
                                       campaignList: ReadonlyArray<ICampaignDownloadData>): ICampaignsDownloadedEvent {
        return {
            log_source: "sdk",
            log_details: {
                campaigns: campaignList,
            },
            seqnum,
            type: "qa_log_event",
            time: Date.now(),
            log_type: "campaigns-downloaded",
        };
    }

    public getCampaignTriggeredEvent(
        event_name: string, event_payload: object, reason: string, displayed: string, campaigns: IQACampaignTriggerEvent[] = [],
    ): IQATriggerReport {
        return {
            event_name,
            event_payload,
            displayed,
            reason,
            campaigns,
        };
    }

    public getWrappedCampaignTriggeredEvent(seqnum: number, event: IQATriggerReport): ICampaignTriggeredEvent {
        return {
            type: "qa_log_event",
            log_type: "campaign-triggered",
            seqnum,
            time: Date.now(),
            log_source: "sdk",
            log_details: event,
        };
    }
}
