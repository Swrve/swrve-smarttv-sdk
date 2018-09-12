import { md5Sync } from "./md5";

export function getSessionToken(userId: string, appId: number, apiKey: string, date: Date): string {
    const seconds = Math.round(date.getTime() / 1000);
    const hash = md5Sync(userId + seconds + apiKey);

    return appId + "=" + userId + "=" + seconds + "=" + hash;
}
