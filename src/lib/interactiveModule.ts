import type { Rect } from './pointUtils';
import { canvasPointerEvents } from './eventModule';
import createMovementModule from './moveService';

import { type Point } from './pointUtils';
import createScaleModule from './scaleService';
import type { EngineState } from './state';

export type SetterFunc<T> = (prev: T) => T;
export type SetterArg<T> = T | SetterFunc<T>;
export type Setter<T> = (value: T) => void;
export type Constraint = [number, number];

const DEFAULT_ZOOM_CONSTRAINTS: Constraint = [0.25, 8];
const CONSTRAINT_THRESHOLD = 0;

type PointConstraint = { x: Constraint; y: Constraint };
type ConstraintOptions<V, C> = {
  enabled?: boolean;
  constraints?: C;
  constrain?: Constrainer<V>;
};

type Constrainer<V> = (value: V) => V;

type InteractiveCanvasModuleProps = {
  state: EngineState;
  constraints?: {
    enabled?: boolean;
    origin?: ConstraintOptions<Point, PointConstraint>;
    scale?: ConstraintOptions<number, Constraint>;
  };
  moveEnabled?: boolean;
  scaleEnabled?: boolean;
  zoomAt?: (scale: number, point: Point) => void;
  getViewportRect: () => Rect;
};

export const computeNextValue = <T>(value: SetterArg<T>, prev: T): T => {
  return typeof value === 'function' ? (value as SetterFunc<T>)?.(prev) : value;
};

const originConstrainerDefault: ConstraintOptions<Point, PointConstraint> = {
  enabled: false,
} as const;

const defaultScaleConstraints: ConstraintOptions<number, Constraint> = {
  enabled: true,
  constraints: DEFAULT_ZOOM_CONSTRAINTS,
} as const;

export default function createInteractiveCanvasModule(
  props: InteractiveCanvasModuleProps,
) {
  const {
    state,
    getViewportRect,
    constraints,
    moveEnabled = true,
    scaleEnabled = true,
  } = props;

  const scaleConstrainConfig = {
    ...defaultScaleConstraints,
    ...(constraints?.scale || {}),
  };
  const originConstrainConfig = {
    ...originConstrainerDefault,
    ...(constraints?.origin || {}),
  };

  const constrainOrigin = createOriginConstrainer(originConstrainConfig);
  const constrainScale = createScaleConstrainer(scaleConstrainConfig);

  const moveService = createMovementModule({
    state,
    constrainOrigin,
    move: state.setOrigin,
  });

  const scaleService = createScaleModule({
    state,
    scale: (scale, origin) =>
      state.setTransform({ origin: origin, scale: scale }),
    constrainScale,
    constrainOrigin,
    rect: getViewportRect,
  });

  const events = canvasPointerEvents({
    moveEnabled,
    scaleEnabled,
    moveModule: moveService,
    scaleModule: scaleService,
  });

  return {
    scaleService,
    moveService,
    events,
    isMoving: true,
  };
}

const constrain = (value: number, constraints: [number, number]) => {
  const [min, max] = constraints;
  return Math.max(Math.min(value, max), min);
};

function createOriginConstrainer(
  config: ConstraintOptions<Point, PointConstraint> | undefined,
) {
  if (config?.enabled === false) {
    return (value: Point): Point => value;
  }

  if (config?.constrain) {
    return config.constrain;
  }

  if (config?.constraints) {
    return (value: Point): Point => ({
      x: constrain(value.x, config.constraints!.x),
      y: constrain(value.y, config.constraints!.y),
    });
  }

  return (value: Point): Point => value;
}

function createScaleConstrainer(
  config: ConstraintOptions<number, Constraint> | undefined,
): Constrainer<number> {
  if (config?.enabled === false) {
    return (value: number): number => value;
  }

  if (config?.constrain) {
    return config.constrain;
  }

  if (config?.constraints) {
    return (value: number): number => constrain(value, config.constraints!);
  }

  return (value: number): number => value;
}

export function getConstraintsAt(
  rect: DOMRect,
  scale: number,
): PointConstraint {
  const vw = rect?.width;
  const vh = rect?.height;

  const halfVisibleX = vw / (2 * scale);
  const halfVisibleY = vh / (2 * scale);

  return {
    x: [
      -halfVisibleX + CONSTRAINT_THRESHOLD,
      vw + halfVisibleX - CONSTRAINT_THRESHOLD,
    ],
    y: [
      -halfVisibleY + CONSTRAINT_THRESHOLD,
      vh + halfVisibleY - CONSTRAINT_THRESHOLD,
    ],
  };
}
