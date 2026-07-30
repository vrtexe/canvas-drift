import type { Transform } from './engine';
import type { Point } from './pointUtils';

export type EngineStateOptions = {
  initial?: Transform;
  onTransformChange?: (newTransform: Transform) => void;
  onScaleChange?: (newScale: number) => void;
  onOriginChange?: (newOrigin: Point) => void;
};

export type EngineState = {
  getTransform: () => Transform;
  setTransform: (newTransform: Transform) => void;
  getOrigin: () => Point;
  setOrigin: (newOrigin: Point) => void;
  getScale: () => number;
  setScale: (newValue: number) => void;
};

export function copyTransform(transform: Transform): Transform {
  return {
    origin: copyPoint(transform.origin),
    scale: transform.scale,
  };
}

export function copyPoint(point: Point): Point {
  return {
    x: point.x,
    y: point.y,
  };
}

const defaultTransform: Transform = {
  origin: { x: 0, y: 0 },
  scale: 1,
};

export function initState(options?: EngineStateOptions): EngineState {
  const { onTransformChange, onScaleChange, onOriginChange } = options || {};
  const transform: Transform = {
    ...defaultTransform,
    ...(options?.initial || {}),
  };

  function getTransform() {
    return transform;
  }

  function setTransform(newTransform: Transform) {
    const originChanged = setOriginInternal(newTransform.origin, false);
    const scaleChanged = setScaleInternal(newTransform.scale, false);

    if (originChanged || scaleChanged) {
      callTransformChange(newTransform);
    }
  }

  function getOrigin() {
    return transform.origin;
  }

  function isOriginUnchanged(newOrigin: Point) {
    return (
      transform.origin.x === newOrigin.x && transform.origin.y === newOrigin.y
    );
  }

  function setOrigin(newOrigin: Point) {
    setOriginInternal(newOrigin, true);
  }

  function setOriginInternal(newOrigin: Point, pushEvent = true) {
    if (isOriginUnchanged(newOrigin)) {
      return false;
    }

    transform.origin.x = newOrigin.x;
    transform.origin.y = newOrigin.y;

    callOriginChange(newOrigin);

    if (!pushEvent) return true;
    callTransformChange(copyTransform(transform));

    return true;
  }

  function setScale(newValue: number) {
    setScaleInternal(newValue, true);
  }

  function setScaleInternal(newValue: number, pushEvent = true) {
    if (transform.scale === newValue) {
      return false;
    }

    transform.scale = newValue;
    callScaleChange(newValue);

    if (!pushEvent) return true;
    callTransformChange(copyTransform(transform));

    return true;
  }

  function getScale() {
    return transform.scale;
  }

  function callTransformChange(newValue: Transform) {
    if (!onTransformChange) return;
    onTransformChange(newValue);
  }

  function callOriginChange(newValue: Point) {
    if (!onOriginChange) return;
    onOriginChange(newValue);
  }

  function callScaleChange(newValue: number) {
    if (!onScaleChange) return;
    onScaleChange(newValue);
  }

  return {
    getTransform,
    setTransform,
    getOrigin,
    setOrigin,
    getScale,
    setScale,
  };
}
