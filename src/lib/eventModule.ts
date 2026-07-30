import type { MoveModule } from './moveService';
import { extractPoint, type Point } from './pointUtils';
import type { ScaleModule } from './scaleService';

type CanvasPointerEventProps = {
  moveEnabled: boolean;
  scaleEnabled: boolean;
  moveModule: MoveModule;
  scaleModule: ScaleModule;
};

export function canvasPointerEvents(props: CanvasPointerEventProps) {
  const { moveModule, scaleModule } = props;
  const { moveEnabled, scaleEnabled } = props;

  const pointers: Map<number, Point> = new Map();

  let isMoving: boolean = false;
  let isScaling: boolean = false;

  const onPointerDown = (e: PointerEvent) => {
    e.stopPropagation();

    if (e.currentTarget instanceof Element)
      e.currentTarget?.setPointerCapture(e.pointerId);

    const pointer = pointers.get(e.pointerId);
    if (pointer) {
      updatePointer(e);
    } else {
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });
    }

    computeActionState();

    if (isScaling) {
      scaleModule.start(pointers.values());
    } else if (isMoving) {
      moveModule.start(extractPoint(e));
    }
  };

  function updatePointer(e: PointerEvent) {
    const pointer = pointers.get(e.pointerId);
    if (!pointer) {
      return false;
    }

    pointer.x = e.clientX;
    pointer.y = e.clientY;

    return true;
  }

  const onPointerMove = (e: PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isMoving && !isScaling) {
      return;
    }

    if (pointers.get(e.pointerId)) {
      // Keep each active pointer's LIVE position up to date. Without this the
      // pinch would only ever see the initial down-positions and never detect
      // any spread, so gestures could not scale.
      // const pointersValue = pointers;
      updatePointer(e);
    }

    if (isScaling) {
      scaleModule.gestureScale(pointers.values());
    } else if (isMoving) {
      moveModule.move(extractPoint(e));
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    e.preventDefault();

    if (e.currentTarget instanceof Element)
      e.currentTarget?.releasePointerCapture(e.pointerId);

    pointers.delete(e.pointerId);
    scaleModule.cleanup();

    if (pointers.size === 1) {
      const firstPointer = pointers.values().next().value;
      firstPointer && moveModule.start(firstPointer);
    } else {
      moveModule.cleanup();
    }

    computeActionState();
  };

  function computeActionState() {
    const devices = pointers.size;

    isMoving = moveEnabled && devices >= 1;
    isScaling = scaleEnabled && devices === 2;
  }

  const onWheel: (e: WheelEvent) => void = (e) => {
    e.stopPropagation();
    e.preventDefault();

    scaleModule.wheelScale(e.deltaY, () => extractPoint(e));
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  };
}
