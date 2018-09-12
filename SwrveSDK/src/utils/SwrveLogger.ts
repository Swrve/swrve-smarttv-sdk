/* tslint:disable:no-console */

export default class SwrveLogger {
    public static readonly DEBUG: number = 20;
    public static readonly INFO: number = 30;
    public static readonly WARN: number = 40;
    public static readonly ERROR: number = 50;
    public static readonly NONE: number = 100;

    public static error(message: string, ...args: any[]): void {
        if (_level <= SwrveLogger.ERROR) {
            console.error(message, ...args);
        }
    }

    public static warn(message: string, ...args: any[]): void {
        if (_level <= SwrveLogger.WARN) {
            console.warn(message, ...args);
        }
    }

    public static info(message: string, ...args: any[]): void {
        if (_level <= SwrveLogger.INFO) {
            console.log(message, ...args);
        }
    }

    public static debug(message: string, ...args: any[]): void {
        if (_level <= SwrveLogger.DEBUG) {
            console.log('DEBUG:', message, ...args);
        }
    }

    public static level(level?: number): number {
        if (level === undefined) {
            return _level;
        } else {
            return _level = level;
        }
    }
}

let _level: number = SwrveLogger.ERROR;
