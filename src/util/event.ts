export function attachWheelEvent<T extends HTMLElement>(
  element: T | null,
  handler: (e: WheelEvent) => void,
  options?: AddEventListenerOptions,
) {
  if (!element) return;

  return attachEvent("wheel", element, handler, options);
}

export function attachEvent<K extends keyof HTMLElementEventMap, T extends HTMLElement | Window>(
  event: K,
  element: T | null,
  handler: (this: T, ev: HTMLElementEventMap[K]) => any,
  options?: AddEventListenerOptions | boolean,
) {
  if (!element) return;

  element.addEventListener(event, handler as EventListenerOrEventListenerObject, options);

  return () => {
    element.removeEventListener(event, handler as EventListenerOrEventListenerObject, options);
  };
}
