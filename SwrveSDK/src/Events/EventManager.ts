import {getStringSize} from "../utils/StringHelper";
import {StorageManager} from "../Storage/StorageManager";
import SwrveLogger from "../utils/SwrveLogger";
import SwrveEvent from "../WebApi/Events/SwrveEvent";
import { SwrveRestClient } from "../RestClient/SwrveRestClient";

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

    public sendQueue(userId: string): Promise<boolean> {
        const eventsToSend = this.getAllQueuedEvents(userId);
        this.clearStoredEvents(userId);
        this.clearQueue();

        if (eventsToSend.length > 0) {
            return this.restClient.postEvents(eventsToSend)
                .then(response => {
                    if (response == null || response instanceof Error) {
                        return false;
                    } else if (response.ok) {
                        SwrveLogger.info("Queue posted to server");
                        return true;
                    } else if (response.status === 500) {
                        throw new Error('Internal Server Error: ' + response.statusText);
                    } else {
                        SwrveLogger.debug("Unsuccessful send queue response", response);
                        return false;
                    }
                })
                .catch((error) => {
                    SwrveLogger.warn("Failed to post events, saving queue for later", error);
                    this.storeEvents([...eventsToSend, ...this.getAllQueuedEvents(userId)], userId);
                    return false;
                });
        } else {
            SwrveLogger.info("nothing to send");
            return Promise.resolve(false);
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
}
