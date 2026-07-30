import { useRef } from 'react';
import type { Point, Rect } from './lib/pointUtils';
import createEngine from './lib/engine';

type LibOptions = {
  viewport: () => Rect | null;
  canvas: () => Rect | null;
  zoomEnabled: boolean;
  panEnabled: boolean;
  padding?: number;
  onTransform?: (transform: { origin: Point; scale: number }) => void;
};

export default function useLib({
  viewport,
  canvas,
  onTransform,
}: LibOptions) {
  // Keep a ref to the latest onTransform so the engine (created once) always
  // calls the current closure instead of the one captured on first render.
  const onTransformRef = useRef(onTransform);
  onTransformRef.current = onTransform;

  const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);

  if (engineRef.current === null) {
    engineRef.current = createEngine({
      viewport: viewport,
      canvas: canvas,
      state: {
        onTransformChange: (transform) => onTransformRef.current?.(transform),
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

    onPointerDown: engine.event.onPointerDown,
    onPointerMove: engine.event.onPointerMove,
    onPointerUp: engine.event.onPointerUp,
    onWheel: engine.event.onWheel,
  };
}
