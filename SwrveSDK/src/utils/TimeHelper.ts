
export type TimeAndDate = number | Date;

export function getDateObject(t: TimeAndDate): Date {
    return (typeof t === "number" || typeof t === "string")
        ? new Date(t)
        : t;
}

export function getTimestampMilliseconds(t: TimeAndDate): number {
    return getDateObject(t).getTime();
}

export function getTimestampSeconds(t: TimeAndDate): number {
    return Math.floor(getTimestampMilliseconds(t) / 1000);
}

export function getISOString(t: TimeAndDate): string {
    return getDateObject(t).toISOString();
}

export function getInstallDateFormat(t: TimeAndDate): string {
    return getISOString(t).split('T')[0].replace(/-/g , '');
}
