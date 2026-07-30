import { type Point } from './pointUtils.ts';
import type { EngineState } from './state.ts';

export type MoveConfig = {
  state: EngineState;
  constrainOrigin: (origin: Point) => Point;
  move: (origin: Point) => void;
};

export type MoveModule = {
  start: (point: Point) => void;
  cleanup: () => void;
  move: (point: Point) => void;
  moveTo: (origin: Point) => void;
};

/**
 * origin=startOrigin−(pointer−startPoint)/zoom
 * @param config
 * @returns
 */
export default function createMovementModule(config: MoveConfig): MoveModule {
  let startPoint: Point | undefined;
  let startOrigin: Point | undefined;

  return {
    start: (point: Point) => {
      startPoint = point;
      startOrigin = { ...config.state.getOrigin() };
    },
    cleanup: () => {
      startPoint = undefined;
      startOrigin = undefined;
    },
    move: (point: Point) => {
      if (!startPoint || !startOrigin) {
        return;
      }

      const scale = config.state.getScale();

      const dx = point.x - startPoint.x;
      const dy = point.y - startPoint.y;

      config.move(
        config.constrainOrigin({
          x: startOrigin.x - dx / scale,
          y: startOrigin.y - dy / scale,
        }),
      );
    },
    moveTo: (origin: Point) => {
      config.move(config.constrainOrigin(origin));
    },
  };
}
