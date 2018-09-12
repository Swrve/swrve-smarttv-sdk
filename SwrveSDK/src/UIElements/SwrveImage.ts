import {ISwrveImage, ISwrveAsset} from "../Campaigns/ISwrveCampaign";

export class SwrveImage implements ISwrveAsset {
    constructor(public swrveImage: ISwrveImage) {
    }

    public getAssetID(): string | number {
        return this.swrveImage.image.value;
    }

    public getAssetPath(): string | number {
        return this.swrveImage.image.value;
    }
}
