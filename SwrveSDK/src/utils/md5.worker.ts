import MD5 from 'crypto-js/md5';

const ctx: Worker = self as any;

ctx.onmessage = (ev: MessageEvent) => {
    const { id, payload } = ev.data;
    const result = MD5(payload).toString();

    ctx.postMessage({
        id,
        payload: result,
    });
};
