import {getSessionToken} from "../utils/CryptoHelper";
import {IUser} from './IUser';
import {IQAUser} from "../Campaigns/ISwrveCampaign";
import {StorageManager} from "../Storage/StorageManager";
import SwrveLogger from "../utils/SwrveLogger";
import {generateUuid} from "../utils/uuid";
import { SWRVE_USER_ID } from "../utils/SwrveConstants";
import DateHelper from "../utils/DateHelper";

export class ProfileManager
{
    private _currentUser: IUser;
    constructor(
        public userId: string,
        private readonly appId: number, 
        private readonly apiKey: string, 
        private readonly newSessionInterval: number,
    ) {
        const session_token = getSessionToken(this.userId, this.appId, this.apiKey, new Date());
        const currentUser = StorageManager.getData(userId);

        if (currentUser) {
            this._currentUser = JSON.parse(currentUser);
            this.resolveCurrentUser(session_token);
        } else {
            this._currentUser = {userId, sessionToken: session_token, sessionStart: DateHelper.nowInUtcTime(),
                isQAUser: false, nextSeqNum: 0, firstUse: 0, lastSessionEnd: 0, isAnonymous: true};
        }

        StorageManager.saveData(userId, JSON.stringify(this._currentUser));
    }

    public hasSessionRestored(): boolean {
        if (this.currentUser.lastSessionEnd !== 0) {
          const lastSession: number = this.currentUser.lastSessionEnd;
          const now: number = Number(DateHelper.nowInUtcTime());
          const expirationTimeout: number = this.newSessionInterval * 1000; /** convert to ms */
          SwrveLogger.debug(`current time ${now}`);
          SwrveLogger.debug(`lastSession: ${lastSession}`);
          const diffTime: number = now - lastSession;
          SwrveLogger.debug(`Diff now - lastSession: ${diffTime}`);
          if (lastSession && diffTime > expirationTimeout) {
            SwrveLogger.debug('session has expired.');
            return false;
          }
          SwrveLogger.debug('session still active');
          return true;
        }
        SwrveLogger.debug('no session. treating as expired');
        return false;
    }

    public getNextSequenceNumber(): number {
        const nextSeqNum = ++this._currentUser.nextSeqNum;
        StorageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));

        return nextSeqNum;
    }

    public getSessionToken(): string {
        return this._currentUser.sessionToken;
    }

    public getSwrveIdByThirdPartyId(thirdPartyUserId: string): string | null {
        const cachedSwrveId = StorageManager.getData("ext-" + thirdPartyUserId);
        return cachedSwrveId !== null ? cachedSwrveId : null;
    }

    public cacheThirdPartyId(thirdPartyLoginId: string, swrveId: string): void {
        StorageManager.saveData("ext-" + thirdPartyLoginId, swrveId);
    }

    public static storeUserId(userId: string): void {
        StorageManager.saveData(SWRVE_USER_ID, userId);
    }

    public static getStoredUserId(): string | null {
        return StorageManager.getData(SWRVE_USER_ID);
    }

    public static isUserIdVerified(userId: string): boolean {
        const verified = StorageManager.getData("verified-" + userId);
        if (verified) {
            return true;
        }
        return false;
    }

    public static setUserIdAsVerified(userId: string): void {
        if (!this.isUserIdVerified(userId)) {
            StorageManager.saveData("verified-" + userId, "VERIFIED");
        }
    }

    public setCurrentUserAsNewAnonymousUser(): void {
        const newAnonUserId = generateUuid().toString();
        this.setCurrentUser(newAnonUserId, true);
    }

    public setCurrentUser(newUserId: string, markAsAnonymous: boolean = false): void {
        const session_token = getSessionToken(newUserId, this.appId, this.apiKey, new Date());
        const currentUser = StorageManager.getData(newUserId);

        if (currentUser) {
            this._currentUser = JSON.parse(currentUser);
            this.resolveCurrentUser(session_token);
        } else {
            this._currentUser = {userId: newUserId, sessionToken: session_token, sessionStart: DateHelper.nowInUtcTime(),
                isQAUser: false, nextSeqNum: 1, firstUse: 0, lastSessionEnd: 0, isAnonymous: markAsAnonymous};
        }

        StorageManager.saveData(newUserId, JSON.stringify(this._currentUser));
        StorageManager.saveData(SWRVE_USER_ID, this.currentUser.userId);
    }

    public set firstUse(firstUseDate: number) {
        this.currentUser.firstUse = firstUseDate;
        StorageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));
    }

    public get currentUser(): IUser {
        return this._currentUser;
    }

    public setAsQAUser(qaUserNode: IQAUser): void {
        this.currentUser.isQAUser = true;
        this.currentUser.qaUser = qaUserNode;

        StorageManager.saveData(this.currentUser.userId, JSON.stringify(this._currentUser));
    }

    public clearQAUser(): void {
        this.currentUser.isQAUser = false;
        StorageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));
        //dont clear the sequence number in case they come back as a QA user sometime in the future
    }

    public isQAUser(): boolean {
        return this._currentUser.isQAUser;
    }

    public get QAUser(): IQAUser | undefined {
        return this.isQAUser() ? this._currentUser.qaUser : undefined;
    }

    public storeEtagHeader(etag: string): void {
        SwrveLogger.info("New Etag " + etag + " Old etag " + this._currentUser.etag);
        this._currentUser.etag = etag;
        StorageManager.saveData(this.currentUser.userId, JSON.stringify(this._currentUser));
    }

    public clearEtagHeader(): void {
        this.currentUser.etag = undefined;
        StorageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));
    }

    public saveCurrentUserBeforeSessionEnd(): void {
        this._currentUser.lastSessionEnd = DateHelper.nowInUtcTime();
        StorageManager.saveData(this._currentUser.userId, JSON.stringify(this._currentUser));
        StorageManager.saveData(SWRVE_USER_ID, this.currentUser.userId);
        SwrveLogger.debug(`Saved last session end: ${this._currentUser.lastSessionEnd}`);
    }

    private restoreCurrentUser(session_token: string, userId: string, newSessionStart: number): void {
        this._currentUser.sessionToken = session_token;
        this._currentUser.sessionStart = newSessionStart;
        this._currentUser.userId = userId;
        SwrveLogger.debug(`Setup current user: ${this._currentUser.userId}`);
    }

    private resolveCurrentUser(session_token: string): void {
        const userId = this._currentUser.userId;
        if (this.hasSessionRestored()) {
          if (!this._currentUser.sessionStart) {
            const previousSessionStart = new Date(this._currentUser.sessionStart);
            session_token = getSessionToken(userId, this.appId, this.apiKey, previousSessionStart);
          }
          this.restoreCurrentUser(session_token, userId, this._currentUser.sessionStart);
        } else {
          this.restoreCurrentUser(session_token, userId, DateHelper.nowInUtcTime());
        }  
    }
}
