import IDictionary from "../IDictionary";

/**
 * NavigationManager class, should attempt to create a universal singleton
 */
export default class Navigation {
  /** True if menu has been initialized and keys bound. */
  private initialized: boolean;

  private readonly handlers: IDictionary<Array<(key: string) => void>> = {};

  constructor(private readonly keymapping: IKeyMapping) {
    this.initialized = false;
  }

  /**
   * Sets up key bindings.
   */
  public init(): void {
    if (!this.initialized) {
      document.addEventListener("keydown", this.onKeydown);
      document.addEventListener("keyup", this.onKeyup);
      this.initialized = true;
    }
  }

  public stop(): void {
      if (this.initialized) {
          document.removeEventListener("keydown", this.onKeydown);
          document.removeEventListener("keyup", this.onKeyup);
          this.initialized = false;
      }
  }

  /**
   * Simple pub sub model for back handling
   * @param key - event to subscribe to
   * @param func - function to subscribe to back events.
   * @returns unsubscribe function.
   */
  public subscribeToKey(key: string, func: (key: string) => void): IKeySubscription {
    // Find or create Queue
    if (!Object.hasOwnProperty.call(this.handlers, key)) {
      this.handlers[key] = [];
    }

    const index = this.handlers[key].push(func) - 1;
    return {
      index,
      unsubscribe: () => delete this.handlers[key][index],
    };
  }

  private onKeydown = (e: KeyboardEvent) => {
    const eventName = this.keymapper(e.keyCode);
    const sent = this.send(eventName);
    if (sent) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private onKeyup = (e: KeyboardEvent) => {
    const eventName = this.keymapper(e.keyCode);
    const sent = this.send(eventName + "Up");
    if (sent) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  /**
   * Publish key event
   * @param key - event to be published
   */
  private publish(key: string): boolean {
    if (!Object.hasOwnProperty.call(this.handlers, key)) {
      return false;
    }
    // Defer until end of call stack (a bit more safe);
    setTimeout(() => {
      this.handlers[key].forEach(handler => {
        handler(key);
      });
    }, 0);

    return true;
  }

  /**
   * routes events to the currently active publish method.
   * currently just callback publisher
   * @param evt - event to send
   * @returns whether we did anything with the event.
   */
  private send(evt: string): boolean {
      if (!evt) return false;
      return this.publish(evt);
  }

  private keymapper(code: number): string {
    return this.keymapping[code];
  }
}

export interface IKeySubscription {
  readonly index: number;
  readonly unsubscribe: () => void;
}

export interface IKeyMapping {
  readonly [keyCode: number]: string;
}
