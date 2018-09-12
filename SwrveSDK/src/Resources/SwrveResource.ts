import { IUserResource } from "../Campaigns/ISwrveCampaign";

export class SwrveResource {
    public readonly getAttributeAsString: (attributeId: string, defaultValue: string) => string;

    public readonly getAttributeAsNumber: (attributeId: string, defaultValue: number) => number;

    public readonly getAttributeAsBoolean: (attributeId: string, defaultValue: boolean) => boolean;

    public readonly toJSON: () => IUserResource;

    constructor(attributes: IUserResource) {
        attributes = typeof attributes === "object" ? attributes : {};

        this.getAttributeAsString = (attributeId: string, defaultValue: string): string => {
            if (attributeId in attributes) {
                return String(attributes[attributeId]);
            }
            return defaultValue;
        };

        this.getAttributeAsNumber = (attributeId: string, defaultValue: number): number => {
            if (attributeId in attributes) {
                const value = Number(attributes[attributeId]);
                if (!isNaN(value)) {
                    return value;
                }
            }
            return defaultValue;
        };

        this.getAttributeAsBoolean = (attributeId: string, defaultValue: boolean): boolean => {
            if (attributeId in attributes) {
                const value = attributes[attributeId];
                if (String(value).match(/^true|yes$/i)) {
                    return true;
                }
                return false;
            }
            return defaultValue;
        };

        this.toJSON = () => ({ ...attributes });
    }
}
