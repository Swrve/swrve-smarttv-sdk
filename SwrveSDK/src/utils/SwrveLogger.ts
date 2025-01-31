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
            if (_onLoggerEvent) {
                _onLoggerEvent(message, SwrveLogger.INFO);
            }
        }
    }

    public static debug(message: string, ...args: any[]): void {
        if (_level <= SwrveLogger.DEBUG) {
            console.log('DEBUG:', message, ...args);
            if (_onLoggerEvent) {
                _onLoggerEvent(message, SwrveLogger.DEBUG);
            }
        }
    }

    public static level(level?: number): number {
        if (level === undefined) {
            return _level;
        } else {
            return _level = level;
        }
    }

    public static OnLogEvent(callback: OnLoggerEvent): void {
        _onLoggerEvent = callback;
    }
}

export type OnLoggerEvent = (message: string, level?: number) => void;

let _level: number = SwrveLogger.ERROR;
let _onLoggerEvent: OnLoggerEvent | null = null;
