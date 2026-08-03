export declare function attachEvent<T extends HTMLElement>(element: T | null, handler: (e: WheelEvent) => void, options?: AddEventListenerOptions): (() => void) | undefined;
