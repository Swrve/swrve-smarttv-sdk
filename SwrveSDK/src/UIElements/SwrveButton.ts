import {ISwrveButton, ISwrveAsset} from "../Campaigns/ISwrveCampaign";
import { TextTemplating } from "../utils/TextTemplating";
import IDictionary from "../utils/IDictionary";
import SwrveLogger from "../utils/SwrveLogger";

export class SwrveButton implements ISwrveAsset {
    private _button: ISwrveButton;
    private _cdn: string;
    private _scale?: number;
    private _hasDynamicUrl: boolean;
    private _isSingleLineText: boolean;
    private _personalizationProperties?: IDictionary<string>;

    constructor(
        button: ISwrveButton, 
        cdn: string,
        personalizationProperties?: IDictionary<string>,
        scale?: number,
    ) {
        this._button = button;
        this._cdn = cdn;
        this._scale = scale;
        this._hasDynamicUrl = !!this._button.dynamic_image_url;
        this._isSingleLineText = !!this._button.text;
        this._personalizationProperties = personalizationProperties;
    }

    public get button(): ISwrveButton {
        return this._button;
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

    public getAssetID(): string | number {
        if (this.button.image_up) {
          return this.resolveOrFallbackUrlPersonalization(
            this.button.image_up.value,
          );
        } else {
          return this.resolveOrFallbackUrlPersonalization("");
        }
    }
    
    public getAssetPath(): string {
        if (this.button.image_up) {
            return this.resolveOrFallbackUrlPersonalization(
            `${this._cdn}${this.button.image_up.value}`,
            ) as string;
        } else {
            return this.resolveOrFallbackUrlPersonalization("") as string;
        }
    }

    public canRender(): boolean {
      if (this.isSingleLineText) {
        const resolved = this.resolveTextTemplating(
          <string>this.button.text!.value,
          this._personalizationProperties,
        );
        
        /** return directly since if there's single text then it should either resolve or not show up at all */
        return (resolved !== null);
      }
  
      if (this.hasDynamicUrl) {
        const response = this.resolveTextTemplating(
          this._button.dynamic_image_url!,
          this._personalizationProperties,
        );
        if (response !== null) return true;
      }
  
      if (this._button.image_up !== undefined) {
        return true;
      }
  
      return false;
    }

    public getWidth(): number {
      if (this.hasDynamicUrl) return <number>this.button.w.value;
  
      return this.button.image_width;
    }
  
    public getHeight(): number {
      if (this.hasDynamicUrl) return <number>this.button.h.value;
  
      return this.button.image_height;
    }

    private resolveOrFallbackUrlPersonalization(
        fallback: string | number,
      ): string | number {
        if (this.hasDynamicUrl) {
          try {
            const resolvedUrl = TextTemplating.applyTextTemplatingToString(
              this.button.dynamic_image_url!,
              this._personalizationProperties,
            );
            if (resolvedUrl !== null) {
              return resolvedUrl;
            }
          } catch (e) {}
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
      }
  
      return null;
    }
}
