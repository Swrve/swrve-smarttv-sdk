import {
    ISwrveButton, ISwrveCampaign, ISwrveFormat, ISwrveImage, ISwrveMessage,
} from "../ISwrveCampaign";
import {IPlatform} from "../../utils/platforms/IPlatform";
import {SWRVE_IAM_CONTAINER} from "../../utils/SwrveConstants";
import SwrveFocusManager from "../../UIElements/SwrveFocusManager";
import {ISwrveInternalConfig} from "../../Config/ISwrveInternalConfig";
import {IKeyMapping} from "../../utils/platforms/IKeymapping";
import IDictionary from "../../utils/IDictionary";
import {ResourceManager} from "../../Resources/ResourceManager";
import {ICSSStyle} from "../../Config/ISwrveConfig";

export type OnButtonClicked = (button: ISwrveButton, parentCampaign: ISwrveCampaign) => void;

interface IAMButton {
    button: ISwrveButton;
    campaign: ISwrveCampaign;
    element: HTMLElement;
}

const blacklistedCSSAttributes = [
    // strip out attributes used for positioning
    "position", "width", "height", "top", "left",
    // strip out extra attributes from resources
    "uid", "name", "description", "thumbnail", "item_class",
].reduce((idx, prop) => {
    idx[prop] = true;
    return idx;
}, {} as IDictionary<boolean>);

const defaultStyle = {
    opacity: "0.5",
    transition: "opacity 150ms ease-out",
};

const defaultFocusStyle = {
    opacity: "1",
    transition: "opacity 150ms ease-out",
};

export class SwrveMessageDisplayManager {
    private screenCenterWidth: number = 0;
    private screenCenterHeight: number = 0;
    private onButtonClickedCallback: OnButtonClicked | null = null;
    private isOpen: boolean = false;
    private focusManager?: SwrveFocusManager<IAMButton>;
    private resourceManager?: ResourceManager;
    private normalStyle?: ICSSStyle | string;
    private focusStyle?: ICSSStyle | string;
    private keymap: IKeyMapping;
    private justClosed = false;

    constructor(platform: IPlatform, config?: ISwrveInternalConfig, resourceManager?: ResourceManager) {
        this.normalStyle = config && config.inAppMessageButtonStyle;
        this.focusStyle = config && config.inAppMessageButtonFocusStyle;

        this.keymap = platform.getKeymapping();
        this.resourceManager = resourceManager;
        this.initListener();
    }

    public showMessage(message: ISwrveMessage, parentCampaign: ISwrveCampaign, imagesCDN: string, platform: IPlatform): void {
          this.screenCenterWidth = platform.screenWidth / 2;
          this.screenCenterHeight = platform.screenHeight / 2;

          const iam = this.getLandscapeFormat(message);
          if (iam) {
              this.isOpen = true;
              this.createContainer(message.name, iam.color || undefined);
              this.appendImages(iam.images, imagesCDN, iam.scale);
              const buttons = this.appendButtons(iam.buttons, parentCampaign, imagesCDN, iam.scale);
              this.focusManager = this.createFocusManager(buttons);
              this.focusManager.setActiveFirst();
          }
    }

    public onButtonClicked(callback: OnButtonClicked): void {
        this.onButtonClickedCallback = callback;
    }

    public isIAMShowing(): boolean {
        return this.isOpen;
    }

    public closeMessage(): void {
        const container = document.getElementById(SWRVE_IAM_CONTAINER);
        if (container) {
            document.body.removeChild(container);
        }

        this.isOpen = false;
        this.justClosed = true;
        delete this.focusManager;
    }

    private onKeyUp = (ev: KeyboardEvent) => {
        // Closing the message will fire up one last "keyup" event
        // This prevents that keyup event from spreading down to the app
        if (this.justClosed) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            this.justClosed = false;
            return;
        }
    }

    private onKeydown = (ev: KeyboardEvent) => {
        if (!this.isOpen) {
            return;
        }

        ev.preventDefault();
        ev.stopImmediatePropagation();

        const key = this.keymap[ev.keyCode];
        if (key === "Back") {
            this.closeMessage();
        } else if (key && this.focusManager) {
            this.focusManager.onKeyPress(key);
        }
    }

    private initListener(): void {
        window.addEventListener(
            "keydown",
            this.onKeydown,
            true,
        );
        window.addEventListener(
            "keyup",
            this.onKeyUp,
            true,
        );
    }

    private getLandscapeFormat(message: ISwrveMessage): ISwrveFormat | null {
        const formats = message.template.formats || null;

        if (formats) {
            let landscape: ISwrveFormat | null = null;

            formats.forEach(format => {
                if (format.orientation === "landscape") {
                    landscape = format;
                }
            });

            return landscape;
        } else {
            return null;
        }
    }

    private createContainer(name: string, color?: string): void {
        const iamContainer = document.createElement("div");

        iamContainer.id = SWRVE_IAM_CONTAINER;
        iamContainer.className = name;
        iamContainer.style.position = "absolute";
        iamContainer.style.zIndex = "2147483647";
        iamContainer.style.backgroundColor = color || "";

        document.body.appendChild(iamContainer);
    }

    private createFocusManager(buttons: ReadonlyArray<IAMButton>): SwrveFocusManager<IAMButton> {
        return new SwrveFocusManager<IAMButton>(buttons, {
            direction: "bidirectional",
            onFocus: (btn) => this.applyElementStyle(btn.element, this.getFocusStyle(this.focusStyle, defaultFocusStyle)),
            onBlur: (btn) => this.applyElementStyle(btn.element, this.getFocusStyle(this.normalStyle, defaultStyle)),
            onKeyPress: ({ button, campaign }, key): boolean => {
                if (key === "Enter") {
                    this.handleButton(button, campaign);
                    return true;
                }
                return false;
            },
        });
    }

    private applyElementStyle(el: HTMLElement, style: ICSSStyle): void {
        for (const attr in style) {
            if (style.hasOwnProperty(attr)) {
                el.style[<any> attr] = style[attr];
            }
        }
    }

    private getFocusStyle(style: ICSSStyle | string | undefined, defaults: ICSSStyle): ICSSStyle {
        let ret = defaults;
        if (typeof style === "string") {
            if (this.resourceManager) {
                const resource = this.resourceManager.getResource(style).toJSON();
                if (Object.keys(resource).length !== 0) {
                    ret = this.sanitizeFocusStyle(resource);
                }
            }
        } else if (style) {
            ret = this.sanitizeFocusStyle(style);
        }
        return ret;
    }

    private sanitizeFocusStyle(style: ICSSStyle): ICSSStyle {
        const ret: ICSSStyle = {};
        for (const key in style) {
            if (style.hasOwnProperty(key) && !blacklistedCSSAttributes[key]) {
                ret[key] = style[key];
            }
        }
        return ret;
    }

    private appendImages(images: ReadonlyArray<ISwrveImage>, cdn: string, scale: number): void {
        images.forEach((image, index) => {
            const imageElement = document.createElement("img");

            imageElement.id = "SwrveImage" + index;
            imageElement.src = cdn + image.image.value as string;

            this.addElement(image, imageElement, scale);
        });
    }

    private appendButtons(buttons: ReadonlyArray<ISwrveButton>, parentCampaign: ISwrveCampaign, cdn: string, scale: number): IAMButton[] {
        return buttons.map((button, index) => {
            const buttonElement = document.createElement("img");
            const buttonStyle = this.getFocusStyle(this.normalStyle, defaultStyle);

            buttonElement.id = "SwrveButton" + index;
            buttonElement.src = cdn + button.image_up.value as string;
            buttonElement.style.border = "0px";
            buttonElement.onclick = () => this.handleButton(button, parentCampaign);

            this.applyElementStyle(buttonElement, buttonStyle);
            this.addElement(button, buttonElement, scale);

            return {
                button,
                campaign: parentCampaign,
                element: buttonElement,
            };
        });
    }

    private addElement(swrveItem: ISwrveButton | ISwrveImage, element: HTMLImageElement, scale: number): void {
        if (typeof swrveItem.x.value === "number" && typeof swrveItem.y.value === "number") {
            const container = document.getElementById(SWRVE_IAM_CONTAINER);
            const width = element.naturalWidth * scale;
            const height = element.naturalHeight * scale;
            const yPos = swrveItem.y.value;
            const xPos = swrveItem.x.value;

            if (width > height) {
                element.style.width = width.toString() + "px";
            } else {
                element.style.height = height.toString() + "px";
            }

            element.style.position = "absolute";
            element.style.top = (yPos + (this.screenCenterHeight - (height / 2))).toString() + "px";
            element.style.left = (xPos + (this.screenCenterWidth - (width / 2))).toString() + "px";

            container!.appendChild(element);
        }
    }

    private handleButton(button: ISwrveButton, parentCampaign: ISwrveCampaign): void {
        this.closeMessage();
        if (this.onButtonClickedCallback) {
            this.onButtonClickedCallback(button, parentCampaign);
        }
    }
}
