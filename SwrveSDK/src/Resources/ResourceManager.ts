import { SwrveResource } from "./SwrveResource";
import { IUserResource } from "../Campaigns/ISwrveCampaign";

export class ResourceManager {
    public readonly getResources: () => IUserResource[] | null;

    public readonly getResource: (resourceId: string) => SwrveResource;

    constructor(
        getResources: typeof ResourceManager.prototype.getResources,
        getResource: typeof ResourceManager.prototype.getResource,
    ) {
        this.getResources = getResources;
        this.getResource = getResource;
    }

    public getAttributeAsString(resourceId: string, attributeId: string, defaultValue: string): string {
        return this.getResource(resourceId).getAttributeAsString(attributeId, defaultValue);
    }

    public getAttributeAsNumber(resourceId: string, attributeId: string, defaultValue: number): number {
        return this.getResource(resourceId).getAttributeAsNumber(attributeId, defaultValue);
    }

    public getAttributeAsBoolean(resourceId: string, attributeId: string, defaultValue: boolean): boolean {
        return this.getResource(resourceId).getAttributeAsBoolean(attributeId, defaultValue);
    }
}
