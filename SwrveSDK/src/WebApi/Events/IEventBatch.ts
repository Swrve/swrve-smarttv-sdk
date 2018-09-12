/**
 * A batch of events.
 *
 * Posted as JSON to `{apiUrl}/1/batch`.
 */
import SwrveEvent from "./SwrveEvent";

export default interface IEventBatch {
    readonly user?: string;
    readonly app_version?: string;
    readonly session_token: string;
    readonly version: number;
    readonly unique_device_id?: string;
    readonly data: ReadonlyArray<SwrveEvent>;
}
