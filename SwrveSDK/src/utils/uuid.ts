/* tslint:disable:no-bitwise */

export function parseUuid(text: string): Uuid {
    const match = /^\s*([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\s*$/i.exec(text);
    if (match == null) {
        throw new Error("Invalid UUID");
    }

    const bytes = (match[1] + match[2] + match[3] + match[4] + match[5])
        .split(/(..)/g)
        .filter(s => s.length === 2)
        .map(s => parseInt(s, 16));

    return new Uuid(bytes);
}

export function generateUuid(): Uuid {
    const bytes = crypto.getRandomValues(new Uint8Array(16)) as Uint8Array;
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return new Uuid([].slice.call(bytes));
}

export class Uuid {
    private readonly bytes: ReadonlyArray<number>;

    constructor(bytes: ReadonlyArray<number>) {
        if (bytes.length !== 16) {
            throw new Error("Invalid UUID: Incorrect byte count");
        }

        this.bytes = bytes.map(b => b & 0xff);
    }

    public toString(): string {
        return this.bytes.map(b => b.toString(16))
            .map(s => ("0" + s).substr(-2))
            .join("")
            .replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, "$1-$2-$3-$4-$5");
    }
}
