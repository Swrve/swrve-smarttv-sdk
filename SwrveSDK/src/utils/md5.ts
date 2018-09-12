import MD5 from 'crypto-js/md5';
import MD5Worker from 'worker-loader?inline=true&fallback=false!./md5.worker';

let globalMsgId = 0;
const resolves: { [index: string]: (result: string) => void } = {};
let worker: Worker;

if ("Worker" in window) {
    worker = new MD5Worker();
    worker.onmessage = handleMessage;
}

function handleMessage(ev: MessageEvent): void {
    const {id, payload} = ev.data;
    const resolve = resolves[id];
    if (resolve) {
        resolve(payload);
    }
    delete resolves[id];
}

function sendMessage(payload: string): Promise<string> {
    const msgId = globalMsgId++;
    const msg = {
        id: msgId,
        payload,
    };

    return new Promise((resolve, reject) => {
        resolves[msgId] = resolve;
        worker.postMessage(msg);
    });
}

export function md5Sync(payload: string): string {
    return MD5(payload).toString();
}

export function md5Async(payload: string): Promise<string> {
    if (worker) {
        return sendMessage(payload);
    } else {
        return Promise.resolve(md5Sync(payload));
    }
}
