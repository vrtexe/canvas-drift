export type Point = { x: number; y: number };

export type Ref<T> = { current: T };

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * @param {Point} point
 * @param {DOMRect} relativePoint
 */
export const convertToRelativeCoords = (
  point: Point,
  relativePoint: Rect,
): Point => {
  return {
    x: point.x - relativePoint.x,
    y: point.y - relativePoint.y,
  };
};

/**
 * @param {Point} point
 * @param {DOMRect} rect
 */
export const convertRelativeToOrigin = (point: Point): Point => {
  return {
    x: point.x, // - rect.width / 2,
    y: point.y, // - rect.height / 2,
  };
};

/**
 * @param {PointerEvent|MouseEvent} e
 * @returns {Point}
 */
export const extractPoint = (e: PointerEvent | MouseEvent): Point => {
  return { x: e.clientX, y: e.clientY };
};

/**
 * @param {Point} p1
 * @param {Point} p2
 * @returns {Point}
 */
export const calculateMiddlePoint = (p1: Point, p2: Point): Point => {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
};

/**
 * @param {Point} p1
 * @param {Point} p2
 * @returns {number}
 */
export const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
};

/**
 * @param {Point} from
 * @param {Point} to
 * @returns {[number, number]}
 */
export const calculatePointDistance = (
  from: Point,
  to: Point,
): [number, number] => {
  return [to.x - from.x, to.y - from.y];
};
