import IDictionary from "../utils/IDictionary";
export interface ISwrveCampaignResourceResponse
{
    real_time_user_properties?: IDictionary<string>;
    user_resources?: ReadonlyArray<IUserResource>;
    location_campaigns?: object;
    campaigns: ISwrveCampaigns;
    qa?: {reset_device_state: boolean, logging: boolean, logging_url?: string, campaigns?: ReadonlyArray<ISwrveCampaign>};
    flush_frequency: number;
    flush_refresh_delay: number;
}

export interface IUserResource {
    [key: string]: string;
}

export interface IQAUser
{
    reset_device_state: boolean;
    logging: boolean;
    logging_url?: string;
    campaigns?: ReadonlyArray<ISwrveCampaign>;
}

export interface ISwrveCampaigns
{
    game_data: object;
    campaigns: ReadonlyArray<ISwrveCampaign>;
    rules: ISwrveGlobalRule;
    cdn_root?: string;
    cdn_paths?: {message_images: string, message_fonts: string};
    version: number;
}

export interface ISwrveCampaign
{
    id: number;
    start_date: number;
    end_date: number;
    rules: ISwrveCampaignRule;
    triggers?: ReadonlyArray<ISwrveTrigger>;
    message_center: boolean;
    embedded_message?: ISwrveEmbeddedMessage;
    messages?: ReadonlyArray<ISwrveMessage>;
    subject: string | null;
}

export interface ISwrveTrigger{
    event_name: string;
    conditions?: ISwrveCondition;
    parentCampaign?: number;
}

export interface ISwrveConditionEq {
    op: "eq";
    key: string;
    value: string;
}

export interface ISwrveConditionAnd {
    op: "and";
    args: ReadonlyArray<ISwrveCondition>;
}

export interface ISwrveConditionEmpty {
    op?: undefined;
}

export type ISwrveCondition = ISwrveConditionEq | ISwrveConditionAnd | ISwrveConditionEmpty;

export interface ISwrveCampaignRule
{
    delay_first_message: number;
    dismiss_after_views: number;
    display_order: string;
    min_delay_between_messages: number;
}

export interface ISwrveGlobalRule
{
    delay_first_message?: number;
    min_delay_between_messages?: number;
    max_messages_per_session?: number;
}

export interface ISwrveBaseMessage {
    id: number;
    name: string;
    priority: number;
    rules: { orientations: string };
    parentCampaign?: number;
}

export interface ISwrveEmbeddedMessage extends ISwrveBaseMessage {
    data: string;
    buttons: ReadonlyArray<string>;
    type: "other" | "json";
}

export interface ISwrveMessage extends ISwrveBaseMessage {
    template: { formats: ReadonlyArray<ISwrveFormat> };
}

export interface ISwrveFormat
{
    name: string;
    orientation: string;
    language: string;
    size: ISwrveSize;
    images: ReadonlyArray<ISwrveImage>;
    buttons: ReadonlyArray<ISwrveButton>;
    scaled_by: number;
    scaled_from: string;
    scale: number;
    color?: string;
}

export interface ISwrveSize
{
    w: ISwrveValue;
    h: ISwrveValue;
}

export interface ISwrveValue
{
    type: string;
    value: number|string;
}

export interface ISwrveAsset {
    getAssetID(): string|number;
    getAssetPath(): string | number;
    canRender(): boolean;
}

export interface ISwrveButton
{
    name: string;
    x: ISwrveValue;
    y: ISwrveValue;
    w: ISwrveValue;
    h: ISwrveValue;
    image_width: number;
    image_height: number;
    image_filename: string;
    type: ISwrveValue;
    action: ISwrveValue;
    game_id: ISwrveValue;
    image_up: ISwrveValue;
    dynamic_image_url?: string;
    text?: ISwrveValue;
}

export interface ISwrveImage
{
    color: ISwrveValue;
    image: ISwrveValue;
    image_filename: string;
    image_height: number;
    image_width: number;
    name: string;
    w: ISwrveValue;
    x: ISwrveValue;
    y: ISwrveValue;
    h: ISwrveValue;
    dynamic_image_url?: string;
    text?: ISwrveValue;
}
