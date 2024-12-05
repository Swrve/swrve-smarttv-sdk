import {
    ISwrveButton, ISwrveCampaign, ISwrveFormat, ISwrveImage, ISwrveMessage,
} from "../ISwrveCampaign";
import * as SwrveConstants from "../../utils/SwrveConstants";
import {IPlatform} from "../../utils/platforms/IPlatform";
import {DEFAULT_IAM_STYLE, IAM_CSS_CLASS_NAME, SWRVE_IAM_CONTAINER} from "../../utils/SwrveConstants";
import SwrveFocusManager from "../../UIElements/SwrveFocusManager";
import {ISwrveInternalConfig} from "../../Config/ISwrveInternalConfig";
import {IKeyMapping} from "../../utils/platforms/IKeymapping";
import IDictionary from "../../utils/IDictionary";
import {ResourceManager} from "../../Resources/ResourceManager";
import {ICSSStyle} from "../../Config/ISwrveConfig";
import SwrveLogger from "../../utils/SwrveLogger";
import { TextTemplating } from "../../utils/TextTemplating";

export type OnButtonClicked = (button: ISwrveButton, parentCampaign: ISwrveCampaign, pageId: string, pageName: string) => void;
export type OnPageViewed = (messageId: number, pageId: number, pageName: string) => void;

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
    private onPageViewedCallback: OnPageViewed | null = null;
    private isOpen: boolean = false;
    private justClosed: boolean = false;
    private focusManager?: SwrveFocusManager<IAMButton>;
    private resourceManager?: ResourceManager;
    private normalStyle?: ICSSStyle | string;
    private focusStyle?: ICSSStyle | string;
    private overrideIAMStyle?: string;
    private keymap: IKeyMapping;

    private currentPageIndex: number = 0;
    private currentMessagePages: any[] = [];
    private sentPageViewEvents: number[] = [];
    private sentNavigationEvents: number[] = [];
    private imagesCDN: string = "";
    private scale: number = 1;
    private personalizationProperties?: IDictionary<string>;

    constructor(platform: IPlatform, config?: ISwrveInternalConfig, resourceManager?: ResourceManager) {
        this.normalStyle = config && config.inAppMessageButtonStyle;
        this.focusStyle = config && config.inAppMessageButtonFocusStyle;
        this.overrideIAMStyle = config && config.inAppMessageStyleOverride;

        this.keymap = platform.getKeymapping();
        this.resourceManager = resourceManager;
        this.initListener();
    }

    public showMessage(
        message: ISwrveMessage,
        parentCampaign: ISwrveCampaign,
        imagesCDN: string,
        platform: IPlatform,
        personalizationProperties?: IDictionary<string>,
    ): void {
        this.currentPageIndex = 0;
        this.currentMessagePages = [];
        this.sentPageViewEvents = [];
        this.sentNavigationEvents = [];
        this.screenCenterWidth = platform.screenWidth / 2;
        this.screenCenterHeight = platform.screenHeight / 2;
        this.personalizationProperties = personalizationProperties;

        const iam = this.getLandscapeFormat(message);
        if (!iam) return;

        this.isOpen = true;
        this.imagesCDN = imagesCDN || '';
        this.scale = iam.scale ?? 1;

        this.createContainer(message.name, iam.color || undefined);

        if (iam.pages && iam.pages?.length > 0) {
            this.currentMessagePages = iam.pages;
            this.renderPage(this.currentPageIndex, parentCampaign);
        } else {
            this.renderContent(iam.images, iam.buttons, parentCampaign);
        }
    }

    public onPageViewed(callback: OnPageViewed): void {
        this.onPageViewedCallback = callback;
    }

    public onButtonClicked(callback: OnButtonClicked): void {
        this.onButtonClickedCallback = callback;
    }

    public isIAMShowing(): boolean {
        return this.isOpen;
    }

    public getSentPageViewEvents(): number[] {
        return this.sentPageViewEvents;
    }

    public getSentNavigationEvents(): number[] {
        return this.sentNavigationEvents;
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

    private onKeyup = (ev: KeyboardEvent) => {
        // Closing the message will fire up one last "keyup" event
        // This prevents that keyup event from spreading down to the app
        if (this.justClosed) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            this.justClosed = false;
            return;
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
            this.onKeyup,
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

    private appendImages(images: ReadonlyArray<ISwrveImage>): void {
        images.forEach((image, index) => {
            const imageElement = document.createElement("img");

            imageElement.id = "SwrveImage" + index;
            if (image.dynamic_image_url && image.dynamic_image_url.length > 0) {
                if (this.personalizationProperties) {
                    imageElement.src = this.personalizeText(image.dynamic_image_url, this.personalizationProperties) ?? "";
                } else {
                    imageElement.src = image.dynamic_image_url;
                }
            } else {
                imageElement.src = this.imagesCDN + image.image.value as string;
            }

            this.addElement(image, imageElement);
        });
    }

    private appendButtons(
        buttons: ReadonlyArray<ISwrveButton>, parentCampaign: ISwrveCampaign): IAMButton[] {
        return buttons.map((button, index) => {
            const buttonElement = document.createElement("img");
            const buttonStyle = this.getFocusStyle(this.normalStyle, defaultStyle);

            const personalizedButton = this.personalizeButton(button);

            buttonElement.id = "SwrveButton" + index;
            if (personalizedButton.dynamic_image_url && personalizedButton.dynamic_image_url.length > 0) {
                buttonElement.src = personalizedButton.dynamic_image_url;
            } else {
                buttonElement.src = this.imagesCDN + personalizedButton.image_up.value as string;
            }

            buttonElement.style.border = "0px";

            buttonElement.onclick = () => this.handleButton(personalizedButton, parentCampaign);

            this.applyElementStyle(buttonElement, buttonStyle);
            this.addElement(button, buttonElement);

            return {
                button,
                campaign: parentCampaign,
                element: buttonElement,
            };
        });
    }

    private addElement(swrveItem: ISwrveButton | ISwrveImage, element: HTMLImageElement): void {
        if (typeof swrveItem.x.value === "number" && typeof swrveItem.y.value === "number") {
            const container = document.getElementById(SWRVE_IAM_CONTAINER);
            let width = element.naturalWidth * this.scale;
            let height = element.naturalHeight * this.scale;
            
            if (swrveItem.dynamic_image_url) {
                width = swrveItem.w.value as number * this.scale;
                height = swrveItem.h.value as number * this.scale;

                //Aspect fit
                const aspectRatio = element.naturalWidth / element.naturalHeight;
                if (width / height > aspectRatio) {
                    width = height * aspectRatio;
                } else {
                    height = width / aspectRatio;
                }
            }
    
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

            if (swrveItem.accessibility_text) {
                if (this.personalizationProperties) {
                    const personalizedAltText = this.personalizeText(swrveItem.accessibility_text, this.personalizationProperties);
                    if (personalizedAltText) {
                        element.alt = personalizedAltText;
                    }
                } else {
                    element.alt = swrveItem.accessibility_text;
                }
            }
            container!.appendChild(element);
        }
    }

    private handleButton(button: ISwrveButton, parentCampaign: ISwrveCampaign): void {
        const type = String(button.type.value);
        const action = String(button.action.value);
        const pageId = this.getCurrentPageId();
        const pageName = this.getCurrentPageName();
        if (type === SwrveConstants.PAGE_LINK) {
            const num: number = Number(action);
            this.changePage(num, parentCampaign);
        } else {
            this.closeMessage();
        }

        if (this.onButtonClickedCallback) {
            this.onButtonClickedCallback(button, parentCampaign, pageId, pageName);
        }
    }

    private createContainer(name: string, color?: string): void {
        const iamContainer = document.createElement("div");

        iamContainer.id = SWRVE_IAM_CONTAINER;
        iamContainer.className = IAM_CSS_CLASS_NAME;

        iamContainer.innerHTML = this.overrideIAMStyle || DEFAULT_IAM_STYLE;
        iamContainer.style.backgroundColor = color || "";

        document.body.appendChild(iamContainer);
    }

    private changePage(newPageId: number, parentCampaign: ISwrveCampaign): void {
        const newPageIndex = this.currentMessagePages.findIndex(page => page.page_id === newPageId);
        if (newPageIndex !== -1) {
            this.currentPageIndex = newPageIndex;
            this.renderPage(newPageIndex, parentCampaign);
        }
    }

    private renderPage(
        pageIndex: number,
        parentCampaign: ISwrveCampaign,
    ): void {
        const container = document.getElementById(SWRVE_IAM_CONTAINER);
        if (!container) return;

        // Cache and reapply style content
        const styleContent = container.querySelector("style")?.outerHTML || "";
        container.innerHTML = styleContent;

        const page = this.currentMessagePages[pageIndex];
        if (page) {
            this.renderContent(page.images, page.buttons, parentCampaign);
        }
    }

    private renderContent(
        images: ReadonlyArray<ISwrveImage> | undefined,
        buttons: ReadonlyArray<ISwrveButton> | undefined,
        parentCampaign: ISwrveCampaign,
    ): void {
        if (images && images.length > 0) {
            this.appendImages(images);
        }
        if (buttons && buttons.length > 0) {
            const buttonElements = this.appendButtons(buttons, parentCampaign);
            this.focusManager = this.createFocusManager(buttonElements);
            this.focusManager.setActiveFirst();
        }

        if (this.onPageViewedCallback) {
            const messageId = parentCampaign.messages && parentCampaign.messages[0] ? parentCampaign.messages[0].id : 0;
            const page = this.currentMessagePages[this.currentPageIndex];
            if (page) {
                this.onPageViewedCallback(messageId, page.page_id, page.page_name);
            } else {
                this.onPageViewedCallback(messageId, 0, "");
            }
        }
    }

    private getCurrentPageId(): string {
        if (!this.currentMessagePages || this.currentMessagePages.length === 0) {
            return "";
        }
        if (this.currentPageIndex < 0 || this.currentPageIndex >= this.currentMessagePages.length) {
            return "";
        }
        const page = this.currentMessagePages[this.currentPageIndex];
        return page.page_id.toString();
    }

    private getCurrentPageName(): string {
        if (!this.currentMessagePages || this.currentMessagePages.length === 0) {
            return "";
        }
        if (this.currentPageIndex < 0 || this.currentPageIndex >= this.currentMessagePages.length) {
            return "";
        }
        const page = this.currentMessagePages[this.currentPageIndex];
        return page.page_name;
    }

    private personalizeButton(button: ISwrveButton): ISwrveButton {
        if (this.personalizationProperties == null) {
            return button;
        }
        let personalizedButton = button;
        if (button.type.value === SwrveConstants.CUSTOM
            && button.action?.value
            && typeof button.action.value === 'string') {
                const personalizedAction = this.personalizeText(button.action.value, this.personalizationProperties);
                if (personalizedAction) {
                    personalizedButton = JSON.parse(JSON.stringify(button)) as typeof button;
                    personalizedButton.action.value = personalizedAction;
                }
        }

        if (button.dynamic_image_url) {
            const personalizedUrl = this.personalizeText(button.dynamic_image_url, this.personalizationProperties);
            if (personalizedUrl) {
                if (!personalizedButton) {
                    personalizedButton = JSON.parse(JSON.stringify(button)) as typeof button;
                }
                personalizedButton.dynamic_image_url = personalizedUrl;
            }
        }

        return personalizedButton;
    }

    private personalizeText(text: string, personalizationProperties: IDictionary<string>): string | null {
        if (text != null) {
            try {
                return TextTemplating.applyTextTemplatingToString(text, personalizationProperties);
            } catch (e) {
                SwrveLogger.error("Could not resolve, error with personalization", e);
            }
        }
        return null;
    }

}
