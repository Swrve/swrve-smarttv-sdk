export type MenuDirection = "horizontal" | "vertical" | "bidirectional";

export interface IPropTypes<T> {
    direction?: MenuDirection;
    onFocus(item: T): void;
    onBlur(item: T): void;
    setActiveFirst?(item: T): void;
    setActiveLast?(item: T): void;
    onKeyPress?(item: T, key: string): boolean;
}

export interface IDirectionKeymap {
    primaryNext: string;
    primaryPrev: string;
}

const keymapHorizontal = {
    primaryNext: 'Right',
    primaryPrev: 'Left',
};

const keymapVertical = {
    primaryNext: 'Down',
    primaryPrev: 'Up',
};

const keymap: {[key in MenuDirection]: IDirectionKeymap | null} = {
    horizontal: keymapHorizontal,
    vertical: keymapVertical,
    bidirectional: null,
};

export default class SwrveFocusManager<T> {
    protected index: number;
    protected items: ReadonlyArray<T>;
    protected props: IPropTypes<T>;

    constructor(items: ReadonlyArray<T>, props: IPropTypes<T>) {
        this.index = 0;
        this.props = props;
        this.items = items;
    }

    public onFocus(): void {
        const child = this.items[this.index];
        if (child) {
            this.props.onFocus(child);
        }
    }

    public onBlur(): void {
        const child = this.items[this.index];
        if (child) {
            this.props.onBlur(child);
        }
    }

    public onKeyPress(key: string): boolean {
        const child = this.items[this.index];
        if (this.props.onKeyPress && child && this.props.onKeyPress(child, key)) {
            return true;
        }
        const { direction } = this.props;

        if (direction === "bidirectional") {
            return this.handleDirection(keymapVertical, key) || this.handleDirection(keymapHorizontal, key);
        } else {
            return this.handleDirection(keymap[direction || "vertical"] || keymapVertical, key);
        }
    }

    public setItems(items: ReadonlyArray<T>): void {
        this.items = items;
    }

    public getItems(): ReadonlyArray<T> {
        return this.items;
    }

    public getCurrentIndex(): number {
        return this.index;
    }

    public setActiveItem(index: number): boolean {
        if (index >= 0 && index < this.items.length) {
            this.props.onBlur(this.items[this.index]);
            this.index = index;
            this.props.onFocus(this.items[this.index]);
        }
        return true;
    }

    public setActiveFirst(): void {
        this.setActiveItem(0);
    }

    public setActiveLast(): void {
        this.setActiveItem(this.items.length - 1);
    }

    protected handleDirection(keymap: IDirectionKeymap, key: string): boolean {
        const { primaryNext, primaryPrev } = keymap;

        if (key === primaryPrev) {
            return this.setActiveItem(this.index - 1);
        }
        if (key === primaryNext) {
            return this.setActiveItem(this.index + 1);
        }

        return false;
    }
}
