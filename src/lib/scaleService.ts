import type { Transform } from './engine';
import {
  calculateDistance,
  calculateMiddlePoint,
  convertToRelativeCoords,
  type Point,
  type Rect,
} from './pointUtils';
import type { EngineState } from './state';

export const WHEEL_SCALE_VELOCITY = 0.075;
export const ZOOM_STEP = 0.1;

export type ScaleState = {
  state: EngineState;
  scale: (scale: number, point: Point) => void;
  rect: () => Rect;
  constrainScale: (scale: number) => number;
  constrainOrigin: (origin: Point) => Point;
};

export type ScaleModule = {
  start: (points: Iterable<Point>) => void;
  cleanup: () => void;
  scaleAt: (scale: number, point: Point) => void;
  scaleTo: (scale: number, pivot?: Point) => void;
  zoomIn: (step?: number) => void;
  zoomOut: (step?: number) => void;
  gestureScale: (pointes: Iterable<Point>) => void;
  wheelScale: (scroll: number, getAbsolutePoint: () => Point) => void;
  buttonScale: (newScale: number) => void;
  buttonScaleBy: (delta: number) => void;
};

export default function createScaleModule(config: ScaleState): ScaleModule {
  let startPoints: Point[] = [];
  let startState: Transform | undefined;

  function centerPoint(): Point {
    const rect = config.rect();
    return { x: rect.width / 2, y: rect.height / 2 };
  }

  function scaleAt(scale: number, point: Point) {
    const px = point.x;
    const py = point.y;

    const currentScale = config.state.getScale();
    const nextScale = config.constrainScale(scale * currentScale);
    const prevOrigin = config.state.getOrigin();

    const nextOrigin = config.constrainOrigin({
      x: prevOrigin.x - (px / nextScale - px / currentScale),
      y: prevOrigin.y - (py / nextScale - py / currentScale),
    });

    config.scale(nextScale, nextOrigin);
  }

  return {
    start(points: Iterable<Point>) {
      startPoints = [...points];
      startState = {
        origin: { ...config.state.getOrigin() },
        scale: config.state.getScale(),
      };
    },
    cleanup() {
      startPoints = [];
      startState = undefined;
    },
    gestureScale(pointes) {
      if (startPoints.length !== 2 || !startState) {
        return;
      }

      const [p1, p2] = pointes;

      const [startP1, startP2] = startPoints;
      const startDistance = calculateDistance(startP1, startP2);
      const currentDistance = calculateDistance(p1, p2);

      if (startDistance === 0 || currentDistance === 0) {
        return;
      }

      const rect = config.rect();
      const startScale = startState.scale;
      const startOrigin = startState.origin;

      const midpoint = midPointCalculator(rect);

      const startMid = midpoint(startP1, startP2);
      const currentMid = midpoint(p1, p2);

      const nextScale = config.constrainScale(
        startScale * (currentDistance / startDistance),
      );

      const origin: Point = {
        x: startOrigin.x + startMid.x / startScale - currentMid.x / nextScale,
        y: startOrigin.y + startMid.y / startScale - currentMid.y / nextScale,
      };

      config.scale(nextScale, origin);
    },
    wheelScale(scroll, getAbsolutePoint) {
      const rect = config.rect();
      const absolutePoint = getAbsolutePoint();
      const point = convertToRelativeCoords(absolutePoint, rect);

      const wheel = scroll < 0 ? 1 : -1;
      const zoom = Math.exp(wheel * WHEEL_SCALE_VELOCITY);

      scaleAt(zoom, point);
    },
    buttonScale(newScale) {
      const currentScale = config.state.getScale();
      scaleAt(newScale / currentScale, centerPoint());
    },
    scaleAt(scale: number, point: Point) {
      scaleAt(scale, point);
    },
    scaleTo(scale, pivot) {
      scaleAt(scale / config.state.getScale(), pivot ?? centerPoint());
    },
    zoomIn(step = ZOOM_STEP) {
      scaleAt(1 + step, centerPoint());
    },
    zoomOut(step = ZOOM_STEP) {
      scaleAt(1 / (1 + step), centerPoint());
    },
    buttonScaleBy(delta) {
      scaleAt(
        (config.state.getScale() + delta) / config.state.getScale(),
        centerPoint(),
      );
    },
  };
}

function midPointCalculator(rect: Rect) {
  return (a: Point, b: Point): Point =>
    calculateMiddlePoint(
      convertToRelativeCoords(a, rect),
      convertToRelativeCoords(b, rect),
    );
}
