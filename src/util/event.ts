export function attachEvent<T extends HTMLElement>(
  element: T | null,
  handler: (e: WheelEvent) => void,
  options?: AddEventListenerOptions,
) {
  if (!element) return;

  element.addEventListener('wheel', handler, options);

  return () => {
    element.removeEventListener('wheel', handler);
  };
}
