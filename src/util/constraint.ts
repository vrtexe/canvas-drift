import {
  constrainTo,
  type Point,
  type PointConstrainer,
  type Rect,
} from 'canvas-drift';

export const CONSTRAINT_THRESHOLD = 0;

export type OriginConstrainerConfig = {
  getViewportRect: () => Rect | null;
  getCanvasRect: () => Rect | null;
  getScale: () => number;
};

export function createConstrainer(
  config: OriginConstrainerConfig,
): PointConstrainer {
  return (origin: Point) => {
    const viewportRect = config.getViewportRect();
    const canvasRect = config.getCanvasRect();
    if (!viewportRect || !canvasRect || canvasRect.width <= 0) return origin;

    return constrainOrigin(origin, config.getScale(), viewportRect, canvasRect);
  };
}

export function constrainOrigin(
  origin: Point,
  scale: number,
  viewport: Rect,
  canvas: Rect,
): Point {
  const visibleX = viewport.width / scale;
  const visibleY = viewport.height / scale;

  return {
    x: constrainTo(
      origin.x,
      -visibleX + CONSTRAINT_THRESHOLD,
      canvas.width - CONSTRAINT_THRESHOLD,
    ),
    y: constrainTo(
      origin.y,
      -visibleY + CONSTRAINT_THRESHOLD,
      canvas.height - CONSTRAINT_THRESHOLD,
    ),
  };
}
