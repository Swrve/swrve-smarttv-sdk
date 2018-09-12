export function getStringSize(str: string): number {
    const len: number = str.length;
    let bytes = 0;
    let codePoint;
    let next: number;
    let i: number;

    for (i = 0; i < len; i++) {
        codePoint = str.charCodeAt(i);

        // Lone surrogates cannot be passed to encodeURI
        if (codePoint >= 0xD800 && codePoint < 0xE000) {
            if (codePoint < 0xDC00 && i + 1 < len) {
                next = str.charCodeAt(i + 1);

                if (next >= 0xDC00 && next < 0xE000) {
                    bytes += 4;
                    i++;
                    continue;
                }
            }
        }

        bytes += (codePoint < 0x80 ? 1 : (codePoint < 0x800 ? 2 : 3));
    }

    return bytes;
}
