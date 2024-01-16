import {
    ISwrveCampaign,
    ISwrveCampaignResourceResponse,
    ISwrveCampaigns,
    ISwrveCondition,
    ISwrveMessage,
    ISwrveTrigger,
    ISwrveAsset,
    ISwrveBaseMessage,
    ISwrveEmbeddedMessage,
} from "./ISwrveCampaign";
import {StorageManager} from "../Storage/StorageManager";
import {ICampaignDownloadData, IQACampaignTriggerEvent} from "../Events/EventTypeInterfaces";
import {ICampaignState} from "./ICampaignState";
import {
    CAMPAIGN_NOT_ACTIVE,
    CAMPAIGN_NOT_DOWNLOADED,
    CAMPAIGN_THROTTLE_LAUNCH_TIME,
    CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
    CAMPAIGN_THROTTLE_RECENT,
    CAMPAIGN_ERROR_INVALID_TRIGGERS,
    GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME,
    GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
    GLOBAL_CAMPAIGN_THROTTLE_RECENT,
    CAMPAIGN_NO_MATCH,
    SWRVE_CAMPAIGN_STATUS_UNSEEN,
    CAMPAIGN_MATCH,
    CAMPAIGN_ELIGIBLE_BUT_OTHER_CHOSEN,
    CAMPAIGN_STATE,
    CAMPAIGNS,
    SWRVE_AUTOSHOW_AT_SESSION_START_TRIGGER,
} from "../utils/SwrveConstants";
import {SwrveMessageDisplayManager} from "./Messages/SwrveMessageDisplayManager";
import {AssetManager} from "./AssetManager";
import {OnMessageListener} from "../SwrveSDK";
import SwrveLogger from "../utils/SwrveLogger";
import {ProfileManager} from "../Profile/ProfileManager";
import {OnButtonClicked} from "./Messages/SwrveMessageDisplayManager";
import {IPlatform} from "../utils/platforms/IPlatform";
import { ISwrveInternalConfig } from "../Config/ISwrveInternalConfig";
import { ResourceManager } from "../Resources/ResourceManager";
import { SwrveButton } from "../UIElements/SwrveButton";
import { SwrveImage } from "../UIElements/SwrveImage";
import DateHelper from "../utils/DateHelper";
import { OnEmbeddedMessageListener } from "../Config/ISwrveConfig";
import IDictionary from "../utils/IDictionary";

export type OnAssetsLoaded = () => void;

export interface ICampaignRuleStatus {
    status: number;
    message: string;
}

export interface ICampaignTriggerStatus {
    globalStatus: ICampaignRuleStatus;
    campaignStatus?: ICampaignRuleStatus;
    campaignFailCode: number;
    campaigns: IQACampaignTriggerEvent[];
}

export class CampaignManager
{
    private campaigns: ReadonlyArray<ISwrveCampaign> = [];
    private campaignState: {[key: string]: ICampaignState} = {};
    private messages: ISwrveMessage[] = [];
    private triggers: ISwrveTrigger[] = [];
    private platform: IPlatform;

    private readonly messageDisplayManager: SwrveMessageDisplayManager;
    private readonly assetManager: AssetManager;
    private onMessageListener: OnMessageListener | null = null;
    private onEmbeddedListener: OnEmbeddedMessageListener | null = null;

    //global rules
    private _maxMessagesPerSession: number = 99999;
    private _minDelay: number = 55;
    private _delayFirstMessage: number = 150;
    private readonly MAX_MESSAGES_PER_SESSION: number = 99999;
    private readonly MIN_DELAY: number = 55;
    private readonly DELAY_FIRST_MESSAGE: number = 150;

    //session counter
    private messagesShownCount: number = 0;
    private lastShownMessageTime: number = 0;

    constructor(public profileManager: ProfileManager, platform: IPlatform,
                config?: ISwrveInternalConfig, resourceManager?: ResourceManager,
    ) {
        this.loadStoredCampaigns(this.profileManager.currentUser.userId);
        this.messageDisplayManager = new SwrveMessageDisplayManager(platform, config, resourceManager);
        this.assetManager = new AssetManager();
        this.platform = platform;
    }

    public storeCampaigns(response: ISwrveCampaignResourceResponse, onAssetsLoaded: OnAssetsLoaded): void {
        if (response === undefined) {
            return;
        }

        if (response.campaigns) {
            this.handleCDN(response);
            this.campaigns = response.campaigns.campaigns || [];
            this.parseGlobalRules(response.campaigns);
            this.parseMessages(this.campaigns);
            this.parseTriggers(this.campaigns);
            this.synchronizeCampaignState();
            this.handleAssets(onAssetsLoaded);
            StorageManager.saveData(CAMPAIGNS + this.profileManager.currentUser.userId, JSON.stringify(this.campaigns));
        }
    }

    public resetCampaignState(): void {
        this.campaigns = [];
        this.messages = [];
        this.triggers = [];
        this.campaignState = {};
        this.messagesShownCount = 0;
        this.lastShownMessageTime = 0;
    }

    public loadStoredCampaigns(userId: string): void {
        this.resetCampaignState();

        const storedCampaigns = StorageManager.getData(CAMPAIGNS + userId);
        if (storedCampaigns) {
            this.campaigns = JSON.parse(storedCampaigns);
        }

        const campaignState = StorageManager.getData(CAMPAIGN_STATE + userId);
        if (campaignState) {
            this.campaignState = JSON.parse(campaignState);
        }

        if (this.campaigns) {
            this.parseMessages(this.campaigns);
            this.parseTriggers(this.campaigns);
        }
    }

    public synchronizeCampaignState(): void {
        // only keep state for campaigns that are sent down
        const origCampaignState = this.campaignState;
        this.campaignState = {};
        this.campaigns.forEach(({ id }) => {
            // ensure new campaigns have a default state
            this.campaignState[id] = origCampaignState[id] || {
                status: SWRVE_CAMPAIGN_STATUS_UNSEEN,
                impressions: 0,
                next: 0,
                lastShownTime: 0,
            };
        });

        StorageManager.saveData(CAMPAIGN_STATE + this.profileManager.currentUser.userId, JSON.stringify(this.campaignState));
    }

    public getCampaignIDs(): ICampaignDownloadData[] {
        return this.campaigns
            .map(campaign => ({
                id: campaign.id,
                type: campaign.messages ? "iam" : "unknown",
                variant_id: this.getCampaignVariantID(campaign),
            }));
    }

    public getCampaignVariantID(campaign: ISwrveCampaign): number {
        return campaign.messages && campaign.messages[0] ? campaign.messages[0].id : 0;
    }

    public getCampaignState(campaignId: string): ICampaignState {
        return this.campaignState[campaignId];
    }

    public onEmbeddedMessage(onEmbeddedMessageListener: OnEmbeddedMessageListener): void {
        this.onEmbeddedListener = onEmbeddedMessageListener;
    }

    public onMessage(onMessageListener: OnMessageListener): void {
        this.onMessageListener = onMessageListener;
    }

    public onButtonClicked(callback: OnButtonClicked): void {
        this.messageDisplayManager.onButtonClicked(callback);
    }

    public showCampaign(
        campaign: ISwrveCampaign, 
        personalizationProperties?: IDictionary<string>,
        impressionCallback?: OnMessageListener,
    ): boolean {
        if (campaign.messages && campaign.messages.length > 0) {
            const message = campaign.messages[0];
            message.parentCampaign = campaign.id;
    
            this.messageDisplayManager.showMessage(
              campaign.messages[0],
              campaign,
              this.assetManager.ImagesCDN,
              this.platform,
              personalizationProperties,
            );

            if (impressionCallback) {
                impressionCallback(message);
            }
      
            this.updateCampaignState(message);
            return true;
        } else if (campaign.embedded_message && campaign.embedded_message.data) {
            const embeddedMessage = campaign.embedded_message;
            embeddedMessage.parentCampaign = campaign.id;
      
            if (this.onEmbeddedListener) {
              this.onEmbeddedListener(
                campaign.embedded_message,
                personalizationProperties,
              );
            }
            return true;
        } else {
            return false;
        }
    }

    public checkTriggers(
        triggerName: string, 
        payload: object, 
        impressionCallback: OnMessageListener, 
        qa: boolean = false, 
        personalizationProperties?: IDictionary<string>,
    ):  ICampaignTriggerStatus {
        const matchingMessages: ISwrveBaseMessage[] = [];
        let globalStatus = this.applyGlobalRules(triggerName);
        let campaignStatus: ICampaignRuleStatus | undefined;
        const campaignStatuses: IQACampaignTriggerEvent[] = [];

        function logCampaignTriggerStatus(id: number, displayed: string, reason: string, code: number): void {
            SwrveLogger.debug("Campaign trigger status: " + reason + " Displayed " + displayed);
            campaignStatus = { status: code, message: reason };
            campaignStatuses.push({ id, displayed, type: "iam", reason });
        }

        if (globalStatus.status === CAMPAIGN_MATCH) {
            //for each campaign, see if there is a matching trigger and pull out the messages if there is
            this.campaigns.forEach( campaign => {
                if (campaign.triggers && campaign.triggers.length > 0) {
                    for (const trigger of campaign.triggers) {
                        const canTrigger = trigger.event_name === triggerName && this.canTriggerWithPayload(trigger, payload);

                        if (!canTrigger && qa) {
                            const reason = "Campaign [" + campaign.id + "], Trigger [" + trigger.event_name + "], " +
                                "does not match eventName[" + triggerName + "] & payload[" + JSON.stringify(payload) +
                                "].  Skipping this trigger.";
                            logCampaignTriggerStatus(campaign.id, "false", reason, CAMPAIGN_NO_MATCH);
                        }
                        if (canTrigger) {
                            if (campaign.messages) {
                                campaign.messages.forEach(
                                    message => (matchingMessages.push(
                                        {parentCampaign: campaign.id, ...message as ISwrveBaseMessage},
                                    )));
                            } else if (campaign.embedded_message) {
                                matchingMessages.push({
                                    parentCampaign: campaign.id,
                                    ...campaign.embedded_message as ISwrveBaseMessage,
                                });
                            }
                            break;
                        }
                    }
                } else {
                    if (qa) {
                        const reason = "Campaign [" + campaign.id + "], no triggers " + "(could be message centre). Skipping this campaign";
                        logCampaignTriggerStatus(campaign.id, "false", reason, CAMPAIGN_ERROR_INVALID_TRIGGERS);
                    }
                }
            });

            if (matchingMessages.length > 0) {
                matchingMessages.sort( (a, b) =>  a.priority - b.priority);

                let passedAllRules = matchingMessages.filter(message => {
                    for (const campaign of this.campaigns) {
                        if (campaign.id === message.parentCampaign!) {
                            const { status, message: reason } = this.applyCampaignRules(triggerName, campaign, personalizationProperties);
                            const ok = status === CAMPAIGN_MATCH;
                            SwrveLogger.debug(reason);
                            if (qa && !ok) {
                                logCampaignTriggerStatus(campaign.id, "false", reason, status);
                            }
                            return ok;
                        }
                    }
                    return false;
                });

                if (passedAllRules.length > 1) {
                    const minPriority = passedAllRules.reduce((min, msg) => msg.priority < min ? msg.priority
                        : min, passedAllRules[0].priority);

                    passedAllRules = passedAllRules.filter((message) => {
                        return message.priority <= minPriority;
                    });
                }

                if (passedAllRules.length > 0) {
                    const randomPick = passedAllRules.length > 1 ? Math.floor(Math.random() * passedAllRules.length) : 0;
                    const selectedMessage = passedAllRules[randomPick];

                    if (qa) {
                        const pickedCampaign = passedAllRules[randomPick];
                        const logNotPicked = passedAllRules.filter((message, index) => index !== randomPick);
                        logNotPicked.forEach(message => {
                            const reason = "Campaign " + pickedCampaign.id + " was selected for display ahead of this campaign.";
                            logCampaignTriggerStatus(message.parentCampaign!, "false", reason, CAMPAIGN_ELIGIBLE_BUT_OTHER_CHOSEN);
                        });

                        const reason = "Campaign [" + pickedCampaign.id + "], Trigger [" + triggerName + "], matches " + triggerName
                                     + " & payload " + JSON.stringify(payload) + ".";
                        logCampaignTriggerStatus(pickedCampaign.parentCampaign!, "true", reason, CAMPAIGN_MATCH);
                    }

                    this.lastShownMessageTime = this.getNow();

                    if (!this.messageDisplayManager.isIAMShowing()) {
                        if (this.onMessageListener) {
                            this.onMessageListener(selectedMessage);
                        } else {
                            for (const campaign of this.campaigns) {
                                if (campaign.id === selectedMessage.parentCampaign!) {
                                    if (campaign.messages && campaign.messages.length > 0) {
                                      this.showMessage(selectedMessage as ISwrveMessage, campaign, personalizationProperties);
                                      this.updateCampaignState(selectedMessage);
                                      impressionCallback(selectedMessage);
                                      break;
                                    }
                    
                                    if (
                                      campaign.embedded_message &&
                                      campaign.embedded_message.data
                                    ) {
                                      if (this.onEmbeddedListener) {
                                        this.onEmbeddedListener(
                                          selectedMessage as ISwrveEmbeddedMessage,
                                          personalizationProperties,
                                        );
                                      }
                    
                                      break;
                                    }
                                  }
                            }
                        }

                        this.updateCampaignState(selectedMessage);
                        if (impressionCallback) {
                            impressionCallback(selectedMessage as ISwrveMessage);
                        }
                    }
                }
            } else  if (qa) {
                globalStatus = { status: CAMPAIGN_NO_MATCH, message: "No matching campaigns." };
            }
        }

        const campaignFailCode = globalStatus.status !== CAMPAIGN_MATCH || !campaignStatus ? globalStatus.status : campaignStatus.status;
        return { globalStatus, campaignStatus, campaignFailCode, campaigns: campaignStatuses };
    }

    public showMessage(message: ISwrveMessage, campaign: ISwrveCampaign, personalizationProperties?: IDictionary<string>): void {
        this.messageDisplayManager.showMessage(message, campaign, this.assetManager.ImagesCDN, this.platform, personalizationProperties);
    }

    public closeMessage(): void {
        this.messageDisplayManager.closeMessage();
    }

    public canTriggerWithPayload(trigger: ISwrveTrigger, payload: any): boolean {
        if (typeof trigger !== "object" || !trigger) {
            return false;
        }
        return this.hasFulfilledCondition(trigger.conditions || {}, payload || {});
    }

    public hasFulfilledCondition(condition: ISwrveCondition, payload: any): boolean {
        switch (condition.op) {
            case "eq":
                return payload[condition.key] === condition.value;
            case "and":
                for (const arg of condition.args) {
                    if (!this.hasFulfilledCondition(arg, payload)) {
                        return false;
                    }
                }
                return true;
            default:
                if (Object.keys(condition).length === 0) {
                    return true;
                }
                return false;
        }
    }

    public handleCDN(response: ISwrveCampaignResourceResponse): void {
        this.assetManager.clearCDN();

        if (response.campaigns && response.campaigns.cdn_root) {
            this.assetManager.ImagesCDN = response.campaigns.cdn_root;
        } else if (response.campaigns && response.campaigns.cdn_paths) {
            const paths = response.campaigns.cdn_paths;
            this.assetManager.ImagesCDN = paths.message_images;
            this.assetManager.FontsCDN = paths.message_fonts;
        }
    }

    public getAssetManager(): AssetManager {
        return this.assetManager;
    }

    public getMessageCenterCampaigns(): ISwrveCampaign[] {
        return this.campaigns.filter(campaign => (campaign.message_center && campaign.messages && campaign.messages.length > 0) 
        || (campaign.message_center && campaign.embedded_message && campaign.embedded_message.data.length > 0))
                             .map(campaign => ({ ...campaign }));
    }

    public updateCampaignState(message: ISwrveBaseMessage): void {
        for (const parentCampaign of this.campaigns) {
            if (parentCampaign.id === message.parentCampaign!) {
                const campaignState = this.campaignState[parentCampaign.id];
                campaignState.impressions++;
                campaignState.status = "seen";
                campaignState.lastShownTime = this.getNow();
                this.campaignState[parentCampaign.id] = campaignState;
                
                StorageManager.saveData(
                  CAMPAIGN_STATE + this.profileManager.currentUser.userId,
                  JSON.stringify(this.campaignState),
                );

                this.messagesShownCount++;
            }
        }
    }

    private applyGlobalRules(triggerName: string): ICampaignRuleStatus {
        if (this.messagesShownCount >= this._maxMessagesPerSession) {
            return {
                status: GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
                message: "{App Throttle limit} Too many messages shown.",
            };
        }

        const timeSinceStartup = this.profileManager.currentUser.sessionStart + (this._delayFirstMessage * 1000);
        SwrveLogger.info("delay first message " + this._delayFirstMessage);
        if (triggerName !== SWRVE_AUTOSHOW_AT_SESSION_START_TRIGGER && timeSinceStartup > this.getNow()) {
            return {
                status: GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME,
                message: "{App Throttle limit} Too soon after launch.  Wait until " + timeSinceStartup,
            };
        }

        const lastDisplay = this.lastShownMessageTime + (this._minDelay * 1000);
        if (this.lastShownMessageTime !== 0 && lastDisplay > this.getNow()) {
            return {
                status: GLOBAL_CAMPAIGN_THROTTLE_RECENT,
                message: "{App Throttle limit} Too soon after last message.  Wait until " + lastDisplay,
            };
        }

        return {
            status: CAMPAIGN_MATCH,
            message: "Global display rules passing.",
        };
    }

    private applyCampaignRules(
        triggerName: string, 
        parentCampaign: ISwrveCampaign, 
        personalizationProperties?: IDictionary<string>,
    ): ICampaignRuleStatus {
        const rules = parentCampaign.rules;
        const campaignState = this.campaignState[parentCampaign.id];

        if (parentCampaign.start_date > this.getNow() || parentCampaign.end_date < this.getNow()) {
            return {
                status: CAMPAIGN_NOT_ACTIVE,
                message: "Campaign " + parentCampaign.id + "not active.",
            };
        }

        const timeSinceStart = this.profileManager.currentUser.sessionStart + (rules.delay_first_message * 1000);
        if (triggerName !== SWRVE_AUTOSHOW_AT_SESSION_START_TRIGGER && timeSinceStart > this.getNow()) {
            return {
                status: CAMPAIGN_THROTTLE_LAUNCH_TIME,
                message: "{Campaign throttle limit} Too soon after launch. Wait until " + timeSinceStart,
            };
        }

        if (rules.hasOwnProperty("dismiss_after_views") && campaignState.impressions >= rules.dismiss_after_views) {
            const message = "{Campaign throttle limit} Campaign " + parentCampaign.id
                          + " has been shown " + parentCampaign.rules.dismiss_after_views + " times already";
            return {
                status: CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
                message,
            };
        }

        const lastShown = campaignState.lastShownTime + (rules.min_delay_between_messages * 1000);
        if (campaignState.lastShownTime !== 0 && lastShown > this.getNow()) {
            const message = "{Campaign throttle limit} Too soon after last campaign. Wait until "
                          + (lastShown + rules.min_delay_between_messages);
            return {
                status: CAMPAIGN_THROTTLE_RECENT,
                message,
            };
        }

        const assetsForTrigger = CampaignManager.getAllAssets(
            [parentCampaign], 
            this.assetManager.ImagesCDN, 
            personalizationProperties,
        );

        if (!this.assetManager.checkAssetsForCampaign(assetsForTrigger)) {
            return {
                status: CAMPAIGN_NOT_DOWNLOADED,
                message: "Assets not loaded for Campaign " + parentCampaign,
            };
        }

        return {
            status: CAMPAIGN_MATCH,
            message: "Campaign " + parentCampaign.id + "passes display rules",
        };
    }

    private parseGlobalRules(campaigns: ISwrveCampaigns): void {
        if (campaigns && campaigns.rules) {
            const rules = campaigns.rules;
            this._maxMessagesPerSession = rules.hasOwnProperty("max_messages_per_session") ?
                rules.max_messages_per_session! : this.MAX_MESSAGES_PER_SESSION;
            this._minDelay = rules.hasOwnProperty("min_delay_between_messages") ? rules.min_delay_between_messages! : this.MIN_DELAY;
            this._delayFirstMessage = rules.hasOwnProperty("delay_first_message") ? rules.delay_first_message! : this.DELAY_FIRST_MESSAGE;
        }

        SwrveLogger.info("Global Rules: max_messages_per_session:" + this._maxMessagesPerSession + " min_delay:" +
            this._minDelay + " delay_first_message:" + this._delayFirstMessage);
    }

    private parseMessages(campaigns: ReadonlyArray<ISwrveCampaign>): void {
        campaigns.forEach( campaign => {
            if (campaign.messages) {
                campaign.messages.forEach(message => this.messages.push({parentCampaign: campaign.id, ...message}));
            }
        });
    }

    private parseTriggers(campaigns: ReadonlyArray<ISwrveCampaign>): void {
        campaigns.forEach(campaign => {
            if (campaign.triggers) {
                campaign.triggers.forEach(trigger => this.triggers.push({parentCampaign: campaign.id, ...trigger}));
            }
        });
    }

    private handleAssets(
        onAssetsLoaded: OnAssetsLoaded, 
        personalizationProperties?: IDictionary<string>,
    ): void {
        const assets = CampaignManager.getAllAssets(
            this.campaigns, 
            this.assetManager.ImagesCDN,
            personalizationProperties,
        );
        this.assetManager.manageAssets(assets)
            .then(() => {
                SwrveLogger.info("CampaignManager: asset download complete");
                onAssetsLoaded();
            })
            .catch(error => {
                SwrveLogger.info("Error downloading assets " + error);
            });
    }

    public static getAllAssets(
        campaigns: ReadonlyArray<ISwrveCampaign>, 
        cdn: string,
        personalizationProperties?: IDictionary<string>,
    ): ISwrveAsset[] {
        const assets: ISwrveAsset[] = [];
        for (const campaign of campaigns) {
            for (const message of campaign.messages || []) {
                const formats = (message.template && message.template.formats) || [];
                for (const format of formats) {
                    for (const button of format.buttons || []) {
                        assets.push(
                            new SwrveButton(button, cdn, personalizationProperties),
                        );
                    }

                    for (const image of format.images || []) {
                        assets.push(
                            new SwrveImage(image, cdn, personalizationProperties),
                        );
                    }
                }
            }
        }

        return assets;
    }

    // private canCampaignRender(
    //     campaign: ISwrveCampaign,
    //     personalizationProperties?: IDictionary<string>,
    //   ): boolean {
    //     const assets = CampaignManager.getAllAssets(
    //       [campaign],
    //       this.assetManager.ImagesCDN,
    //       personalizationProperties,
    //     );
    
    //     return assets.every((asset) => asset.canRender());
    // }

    private getNow(): number {
        return DateHelper.nowInUtcTime();
    }
}
