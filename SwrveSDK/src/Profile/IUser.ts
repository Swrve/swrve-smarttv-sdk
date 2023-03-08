import {IQAUser} from "../Campaigns/ISwrveCampaign";

export interface IUser {
    userId: string;
    sessionToken: string;
    nextSeqNum: number;
    firstUse: number;
    sessionStart: number;
    lastSessionEnd: number;
    isAnonymous: boolean;
    etag?: string;
    isQAUser: boolean;
    qaUser?: IQAUser;
}

export interface IUserInfo {
    readonly userId: string;
    readonly firstUse: number;
    readonly sessionStart: number;
    readonly isQAUser: boolean;
}
