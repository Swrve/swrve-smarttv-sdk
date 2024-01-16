import {ISwrveImage, ISwrveAsset} from "../Campaigns/ISwrveCampaign";
import { TextTemplating } from "../utils/TextTemplating";
import IDictionary from "../utils/IDictionary";
import SwrveLogger from "../utils/SwrveLogger";

export class SwrveImage implements ISwrveAsset {
    private _image: ISwrveImage;
    private _cdn: string;
    private _scale: number | undefined;
    private _hasDynamicUrl: boolean;
    private _isSingleLineText: boolean;
    private _personalizationProperties?: IDictionary<string>;

    constructor(
        image: ISwrveImage,
        cdn: string,
        personalizationProperties?: IDictionary<string>,
        scale?: number,
      ) {
        this._image = image;
        this._cdn = cdn;
        this._scale = scale;
        this._hasDynamicUrl = !!this._image.dynamic_image_url;
        this._isSingleLineText = !!this._image.text;
        this._personalizationProperties = personalizationProperties;
    }

    public get image(): ISwrveImage {
      return this._image;
    }
  
    public get scale(): number | undefined {
      return this._scale;
    }
  
    public get hasDynamicUrl(): boolean {
      return this._hasDynamicUrl;
    }
  
    public get isSingleLineText(): boolean {
      return this._isSingleLineText;
    }

    public canRender(): boolean {
      if (this.isSingleLineText) {
        const resolved = this.resolveTextTemplating(
          <string>this.image.text!.value,
          this._personalizationProperties,
        );
        
        /** return directly since if there's single text then it should either resolve or not show up at all */
        return (resolved !== null);
      }
  
      if (this.hasDynamicUrl) {
        const response = this.resolveTextTemplating(
          this._image.dynamic_image_url!,
          this._personalizationProperties,
        );
        if (response !== null) return true;
      }
  
      if (this._image.image !== undefined) {
        return true;
      }
  
      return false;
    }

    //FIXME: this needs to change for items that have no backup assets
    public getAssetID(): string | number {
        if (this._image.image) {
        return this.resolveOrFallbackUrlPersonalization(this._image.image.value);
        } else {
        return this.resolveOrFallbackUrlPersonalization("");
        }
    }

    public getAssetPath(): string {
        if (this._image.image) {
        return this.resolveOrFallbackUrlPersonalization(
            `${this._cdn}${this.image.image!.value}`,
        ) as string;
        } else {
        return this.resolveOrFallbackUrlPersonalization("") as string;
        }
    }

    public getWidth(): number {
      if (this.hasDynamicUrl) return <number>this.image.w.value;
  
      return this.image.image_width;
    }
  
    public getHeight(): number {
      if (this.hasDynamicUrl) return <number>this.image.h.value;
  
      return this.image.image_height;
    }

    private resolveOrFallbackUrlPersonalization(
        fallback: string | number,
      ): string | number {
        if (this.hasDynamicUrl) {
          const response = this.resolveTextTemplating(
            this._image.dynamic_image_url!,
            this._personalizationProperties,
          );
          if (response !== null) {
            return response;
          }
        }
    
        return fallback;
    }

    private resolveTextTemplating(
        text: string,
        personalizationProperties?: IDictionary<string>,
      ): string | null {
        try {
          const resolvedText = TextTemplating.applyTextTemplatingToString(
            text,
            personalizationProperties,
          );
          if (resolvedText !== null) {
            return resolvedText;
          }
        } catch (e) {
          SwrveLogger.debug("Could not resolve personalization for: " + text);
          return null;
        }
    
        return null;
      }
}
