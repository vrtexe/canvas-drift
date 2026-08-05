import { useMemo, useRef, type PointerEventHandler, type WheelEventHandler as ReactWheelEventHandler } from "react";
import type { CanvasEngine, CanvasEngineOptions } from "canvas-glide";
import { createEngine } from "canvas-glide";
import { createConstrainer } from "./util/constraint";

export type GlideCanvasOptions = CanvasEngineOptions;

export type BaseElement = Element;
export type DomEventListener<
  T extends BaseElement,
  K extends keyof E,
  E extends HTMLElementEventMap = HTMLElementEventMap,
> = (this: T, ev: E[K]) => unknown;

export type PointerDownEventHandler<T extends BaseElement> = DomEventListener<T, "pointerdown">;
export type PointerUpEventHandler<T extends BaseElement> = DomEventListener<T, "pointerup">;
export type PointerMoveEventHandler<T extends BaseElement> = DomEventListener<T, "pointermove">;
export type WheelEventHandler<T extends BaseElement> = DomEventListener<T, "wheel">;

export type GlideCanvasInstance = CanvasEngine & {
  engine: CanvasEngine;

  onPointerDown: PointerEventHandler<Element> & PointerDownEventHandler<Element>;
  onPointerMove: PointerEventHandler<Element> & PointerMoveEventHandler<Element>;
  onPointerUp: PointerEventHandler<Element> & PointerUpEventHandler<Element>;
  onWheel: ReactWheelEventHandler<HTMLDivElement> & WheelEventHandler<Element>;
};

export function useGlideCanvas(config: GlideCanvasOptions): GlideCanvasInstance {
  const engineRef = useRef<CanvasEngine | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  if (engineRef.current === null) {
    const constrainer = createConstrainer({
      getViewportRect: () => configRef.current.getViewportRect(),
      getCanvasRect: () => configRef.current.getCanvasRect(),
      getScale: () => engineRef.current!.getScale(),
    });

    engineRef.current = createEngine({
      constraints: {
        origin: {
          enabled: true,
          constrain: constrainer,
        },
      },
      ...config,
      getViewportRect: () => configRef.current.getViewportRect(),
      getCanvasRect: () => configRef.current.getCanvasRect(),
      state: {
        ...config.state,
        onTransformChange: (t) => configRef.current.state?.onTransformChange?.(t),
        onScaleChange: (s) => configRef.current.state?.onScaleChange?.(s),
        onOriginChange: (o) => configRef.current.state?.onOriginChange?.(o),
      },
      move: {
        ...config.move,
        onIsMovingChange: (v) => configRef.current.move?.onIsMovingChange?.(v),
      },
    });
  }

  const engine = engineRef.current;

  return useMemo(
    () => ({
      ...engine,
      engine,

      onPointerDown: engine.event.onPointerDown as unknown as PointerEventHandler<Element> &
        PointerDownEventHandler<Element>,
      onPointerMove: engine.event.onPointerMove as unknown as PointerEventHandler<Element> &
        PointerMoveEventHandler<Element>,
      onPointerUp: engine.event.onPointerUp as unknown as PointerEventHandler<Element> & PointerUpEventHandler<Element>,
      onWheel: engine.event.onWheel as unknown as ReactWheelEventHandler<HTMLDivElement> & WheelEventHandler<Element>,
    }),
    [engine],
  );
}
