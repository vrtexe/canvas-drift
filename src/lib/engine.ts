import createInteractiveCanvasModule from './interactiveModule';
import type { Point, Rect } from './pointUtils';
import { initState, type EngineStateOptions } from './state';

type EngineOptions = {
  viewport: () => Rect | null;
  canvas: () => Rect | null;

  zoomEnabled?: boolean;
  panEnabled?: boolean;

  padding?: number;
  state?: EngineStateOptions;
};

export type Transform = {
  origin: Point;
  scale: number;
};

export default function createEngine({
  viewport: getViewportRect,
  canvas: getCanvasRect,
  state: stateOptions,
}: EngineOptions) {
  const state = initState(stateOptions);

  // let d: DOMRect;

  const interactiveModule = createInteractiveCanvasModule({
    state,
    getViewportRect(): Rect {
      const viewport = getViewportRect?.();
      if (!viewport) {
        throw new Error('Viewport not found');
      }
      return viewport;
    },
  });

  const getCenterOrigin = (
    zoomOverride = state.getTransform().scale,
  ): Point => {
    const canvas = getCanvasRect?.();
    const viewport = getViewportRect?.();

    if (!viewport || !canvas) {
      return state.getOrigin();
    }

    const viewportRect = viewport;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    return {
      x: canvasWidth / 2 - viewportRect.width / (2 * zoomOverride),
      y: canvasHeight / 2 - viewportRect.height / (2 * zoomOverride),
    };
  };

  const centerOn = (zoom: number): void => {
    state.setTransform({ origin: getCenterOrigin(zoom), scale: zoom });
  };

  const center = (): void => centerOn(state.getScale());

  const fit = (): void => centerOn(1);

  const reset = fit;

  return {
    stateService: state,
    scaleService: interactiveModule.scaleService,
    moveService: interactiveModule.moveService,

    reset,
    fit,
    center,

    event: interactiveModule.events,
  };
}
