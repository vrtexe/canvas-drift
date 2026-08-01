import {
  useRef,
  type PointerEventHandler,
  type WheelEventHandler as ReactWheelEventHandler,
} from 'react';
import type { Point, Rect } from 'canvas-drift';
import { createEngine } from 'canvas-drift';

type LibOptions = {
  viewport: () => Rect | null;
  canvas: () => Rect | null;
  zoomEnabled: boolean;
  panEnabled: boolean;
  padding?: number;
  onTransform?: (transform: { origin: Point; scale: number }) => void;
  onIsMovingChange?: (isMoving: boolean) => void;
};

export type BaseElement = Element;
export type DomEventListener<
  T extends BaseElement,
  K extends keyof E,
  E extends HTMLElementEventMap = HTMLElementEventMap,
> = (this: T, ev: E[K]) => unknown;

export type PointerDownEventHandler<T extends BaseElement> = DomEventListener<
  T,
  'pointerdown'
>;

export type PointerUpEventHandler<T extends BaseElement> = DomEventListener<
  T,
  'pointerup'
>;

export type PointerMoveEventHandler<T extends BaseElement> = DomEventListener<
  T,
  'pointermove'
>;

export type WheelEventHandler<T extends BaseElement> = DomEventListener<
  T,
  'wheel'
>;

export type LibHook = {
  reset: () => void;
  fit: () => void;
  center: () => void;

  stateService: ReturnType<typeof createEngine>['stateService'];
  scaleService: ReturnType<typeof createEngine>['scaleService'];
  moveService: ReturnType<typeof createEngine>['moveService'];

  onPointerDown: PointerEventHandler<Element> &
    PointerDownEventHandler<Element>;
  onPointerMove: PointerEventHandler<Element> &
    PointerMoveEventHandler<Element>;
  onPointerUp: PointerEventHandler<Element> & PointerUpEventHandler<Element>;
  onWheel: ReactWheelEventHandler<HTMLDivElement> & WheelEventHandler<Element>;
};

export default function useLib({
  viewport,
  canvas,
  onIsMovingChange,
  onTransform,
}: LibOptions): LibHook {
  const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);

  if (engineRef.current === null) {
    engineRef.current = createEngine({
      move: {
        onIsMovingChange: (isMoving) => onIsMovingChange?.(isMoving),
      },
      viewport: viewport,
      canvas: canvas,
      state: {
        onTransformChange: (transform) => onTransform?.(transform),
      },
    });
  }
  const engine = engineRef.current;

  return {
    reset: engine.reset,
    fit: engine.fit,
    center: engine.center,

    stateService: engine.stateService,
    scaleService: engine.scaleService,
    moveService: engine.moveService,

    onPointerDown: engine.event
      .onPointerDown as unknown as PointerEventHandler<Element> &
      PointerDownEventHandler<Element>,
    onPointerMove: engine.event
      .onPointerMove as unknown as PointerEventHandler<Element> &
      PointerMoveEventHandler<Element>,
    onPointerUp: engine.event
      .onPointerUp as unknown as PointerEventHandler<Element> &
      PointerUpEventHandler<Element>,
    onWheel: engine.event
      .onWheel as unknown as ReactWheelEventHandler<HTMLDivElement> &
      WheelEventHandler<Element>,
  };
}
