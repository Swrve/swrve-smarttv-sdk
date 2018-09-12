import {ISwrveAsset} from "./ISwrveCampaign";
import PAL from "../utils/PAL";
import {IAsset} from "../utils/platforms/IAsset";
import SwrveLogger from "../utils/SwrveLogger";

export class AssetManager
{
    private assets: {[key: string]: IAsset} = {};
    private _imagesCDN: string = "";
    private _fontsCDN: string = "";

    public manageAssets(newAssets: ReadonlyArray<ISwrveAsset>): Promise<void> {
        for (const asset of newAssets) {
            const key = asset.getAssetID();
            if (this.assets[key] === undefined) {
                SwrveLogger.info("ASSET MANAGER: add new asset " + key);
                this.assets[key] = {id: key, path: this._imagesCDN + asset.getAssetPath().toString()};
            }
        }

        return this.downloadAssets();
    }

    public set ImagesCDN(cdn: string) {
        this._imagesCDN = cdn;
    }

    public get ImagesCDN(): string {
        return this._imagesCDN;
    }

    public set FontsCDN(cdn: string) {
        this._fontsCDN = cdn;
    }

    public get FontsCDN(): string {
        return this._fontsCDN;
    }

    public clearCDN(): void {
        this._imagesCDN = "";
        this._fontsCDN = "";
    }

    public checkAssetsForCampaign(assets: ReadonlyArray<ISwrveAsset>): boolean {
        let allLoaded = true;

        for (const asset of assets) {
            const isLoaded = this.checkCache(asset);
            if (!isLoaded) {
                allLoaded = false;
                break;
            }
        }

        return allLoaded;
    }

    private checkCache( asset: ISwrveAsset): boolean {
        const loadedImage = document.createElement("img");
        loadedImage.src = this._imagesCDN + asset.getAssetPath();

        const element = document.getElementById("PALImageCache");
        if (element) {
            element.appendChild(loadedImage);
        } else {
            SwrveLogger.info("PALImage Cache does not exist");
        }

        return loadedImage.complete || loadedImage.width + loadedImage.height > 0;
    }

    private downloadAssets(): Promise<void> {
        SwrveLogger.info("Asset Manager download assets");
        const values = Object.keys(this.assets).map(key => this.assets[key]);
        return PAL.getPlatform().downloadAssets(values);
    }
}
