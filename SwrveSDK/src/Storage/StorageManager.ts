import PAL from "../utils/PAL";
import { md5Async } from "../utils/md5";
import { NO_SYNCHRONOUS_STORAGE } from "../utils/SwrveConstants";

export class StorageManager {
    public static saveData(key: string, data: string): void {
        this.getStorage().setItem(this.getKey(key), data);
    }

    public static getData(key: string ): string|null {
        return this.getStorage().getItem(this.getKey(key));
    }

    public static clearData(key: string): void {
        this.getStorage().removeItem(this.getKey(key));
    }

    public static saveDataWithMD5Hash(key: string, data: string): Promise<void> {
        const store = this.getStorage();
        return md5Async(key + data)
        .then(md5 => {
            store.setItem(this.getKey(key), data);
            store.setItem(this.getHashKey(key), md5);
        });
    }

    public static getDataWithMD5Hash(key: string): Promise<string | null> {
        const store = this.getStorage();
        const data = store.getItem(this.getKey(key));
        const hash = store.getItem(this.getHashKey(key));

        return md5Async(key + data)
            .then(rehash => hash === rehash ? data : null);
    }

    private static getKey(key: string): string {
        return "swrve." + key;
    }

    private static getHashKey(key: string): string {
        return "swrve." + key + ".hash";
    }

    private static getStorage(): Storage {
        const store = PAL.getPlatform().synchronousStorage;
        if (!store) {
            throw new Error(NO_SYNCHRONOUS_STORAGE);
        }
        return store;
    }
}
