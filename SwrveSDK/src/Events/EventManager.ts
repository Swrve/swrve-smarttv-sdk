import {getStringSize} from "../utils/StringHelper";
import {StorageManager} from "../Storage/StorageManager";
import SwrveLogger from "../utils/SwrveLogger";
import SwrveEvent from "../WebApi/Events/SwrveEvent";
import { SwrveRestClient } from "../RestClient/SwrveRestClient";

export interface ISendQueueResult {
    success: boolean;
    hadEvents: boolean;
    status?: number;
    message?: string | null;
    response?: Response | null;
}

export class EventManager {
    public readonly MAX_QUEUE_SIZE: number = 100 * 1000;

    private queue: SwrveEvent[];
    private _queueSize: number = 0;

    constructor(public restClient: SwrveRestClient) {
        this.queue = [];
    }

    public queueEvent(evt: SwrveEvent): void {
        SwrveLogger.debug("QUEUE EVENT", evt);
        this.queue.push(evt);
        this.calculateQueueSize(evt);
    }

    public getQueue(): SwrveEvent[] {
        return this.queue;
    }

    public clearQueue(): void {
        this.queue = [];
        this._queueSize = 0;
    }

    public clearQueueAndStorage(userId: string): void {
        this.clearQueue();
        StorageManager.clearData("events" + userId);
    }

    public get queueSize(): number {
        return this._queueSize;
    }

    public async sendQueue(userId: string): Promise<ISendQueueResult> {
        const eventsToSend = this.getAllQueuedEvents(userId);
        this.clearStoredEvents(userId);
        this.clearQueue();

        if (eventsToSend.length === 0) {
            SwrveLogger.info("nothing to send");
            return {
                success: false,
                hadEvents: false,
                response: null,
            };
        }

        try {
            const response = await this.restClient.postEvents(eventsToSend);
            if (response == null || response instanceof Error) {
                return {
                    success: false,
                    hadEvents: true,
                    response: null,
                };
            }

            if (response.ok) {
                SwrveLogger.info("Queue posted to server");
                return {
                    success: true,
                    hadEvents: true,
                    status: response.status,
                    response,
                };
            }

            if (response.status === 500) {
                throw new Error("Internal Server Error: " + response.statusText);
            }

            SwrveLogger.debug("Unsuccessful send queue response", response);
            const failureResult = await this.captureResponse(response);
            return {
                success: false,
                hadEvents: true,
                ...failureResult,
                response,
            };
        } catch (error) {
            SwrveLogger.warn("Failed to post events, saving queue for later", error);
            this.storeEvents([...eventsToSend, ...this.getAllQueuedEvents(userId)], userId);
            return {
                success: false,
                hadEvents: true,
                message: error instanceof Error ? error.message : null,
                response: null,
            };
        }
    }

    public getAllQueuedEvents(userId: string): SwrveEvent[] {
        return [...this.queue, ...this.getStoredEvents(userId)];
    }

    public getStoredEvents(userId: string): SwrveEvent[] {
        const storedEvents = StorageManager.getData(this.getStorageKey(userId));
        try {
            return storedEvents ? JSON.parse(storedEvents) : [];
        } catch (e) {
            return [];
        }
    }

    public saveEventsToStorage(userId: string): void {
        if (this.queue.length > 0) {
            SwrveLogger.info("Saving events to storage");
            const allEvents = this.getAllQueuedEvents(userId);
            this.clearQueue();
            this.storeEvents(allEvents, userId);
        } else {
            SwrveLogger.info("nothing to save");
        }
    }

    private storeEvents(events: ReadonlyArray<SwrveEvent>, userId: string): void {
        const data = JSON.stringify(events);
        StorageManager.saveData(this.getStorageKey(userId), data);
        this._queueSize += getStringSize(data) - Math.max(events.length - 1, 0) - 2; // subtract delimiting commas and []
    }

    private calculateQueueSize(evt: SwrveEvent): void {
        const evtString = JSON.stringify(evt);
        this._queueSize += getStringSize(evtString);
    }

    private clearStoredEvents(userId: string): void {
        StorageManager.clearData(this.getStorageKey(userId));
    }

    private getStorageKey(userId: string): string {
        return "events" + userId;
    }

    private captureResponse(response: any): Promise<Pick<ISendQueueResult, "status" | "message">> {
        const status = typeof response?.status === "number" ? response.status : 0;
        const inlineMessage = response?.body?.message || response?.message || null;
        if (inlineMessage || typeof response?.clone !== "function") {
            return Promise.resolve({
                status,
                message: inlineMessage,
            });
        }

        return response.clone().json()
            .then((body: any) => {
                return {
                    status,
                    message: body?.message || null,
                };
            })
            .catch(() => {
                return {
                    status,
                    message: null,
                };
            });
    }
}
