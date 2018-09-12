import {StorageManager} from "../Storage/StorageManager";
import { IUserResource } from "../Campaigns/ISwrveCampaign";
import { ResourceManager } from "./ResourceManager";
import { SwrveResource } from "./SwrveResource";

interface ISwrveResourceIndex {
    [key: string]: SwrveResource;
}

export class ResourceManagerInternal {
    private resourceManager: ResourceManager;
    private resourcesIndex?: ISwrveResourceIndex;
    private resources?: ReadonlyArray<IUserResource>;

    constructor() {
        const getResources = (): IUserResource[] | null => {
            // return a copy
            return this.resources ? this.resources.map(resource => ({ ...resource })) : null;
        };
        const getResource = (resourceId: string): SwrveResource => {
            return (this.resourcesIndex && this.resourcesIndex[resourceId]) || new SwrveResource({});
        };
        this.resourceManager = new ResourceManager(getResources, getResource);
    }

    public storeResources(resources: ReadonlyArray<IUserResource>, userId: string): void {
        this.setResources(resources);
        StorageManager.saveDataWithMD5Hash("resources" + userId, JSON.stringify(resources));
    }

    public getResources(userId: string): Promise<IUserResource[] | null> {
        return StorageManager.getDataWithMD5Hash("resources" + userId)
            .then(data => {
                let resources = null;
                if (data) {
                    resources = JSON.parse(data);
                }
                this.setResources(resources);
                return resources;
            });
    }

    public getResourceManager(): ResourceManager {
        return this.resourceManager;
    }

    private setResources(resources: ReadonlyArray<IUserResource>): void {
        this.resources = resources;
        this.resourcesIndex = (resources || []).reduce((result: ISwrveResourceIndex, item: IUserResource) => {
            result[item.uid] = new SwrveResource(item);
            return result;
        }, {});
    }
}
