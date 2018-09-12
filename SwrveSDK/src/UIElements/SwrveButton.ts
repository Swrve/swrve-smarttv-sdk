import {ISwrveButton, ISwrveAsset} from "../Campaigns/ISwrveCampaign";

export class SwrveButton implements  ISwrveAsset {
    constructor(public button: ISwrveButton) {
    }

    public getAssetID(): string|number {
        return this.button.image_up.value;
    }

    public getAssetPath(): string|number {
        return this.button.image_up.value;
    }
}
