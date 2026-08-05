import { useRef, type RefObject } from "react";
import type { Rect } from "canvas-glide";
import type { ViewportRef } from "../Viewport";

export type ContentSize = { width: number; height: number };

/**
 * Shared contain-fit state for renderers: `idealScale` maps the content's
 * natural size to the viewport at engine scale 1, so engine origins are
 * expressed in the same scale-1 frame for every renderer.
 */
export function useIdealScale(
  viewportRef: RefObject<ViewportRef | null> | undefined,
  getContentSize: () => ContentSize | null,
) {
  const idealScale = useRef(1);

  function updateIdealScale() {
    const viewport = viewportRef?.current;
    const size = getContentSize();
    if (!viewport || !size?.width || !size?.height) {
      idealScale.current = 1;
      return;
    }

    idealScale.current = Math.min(
      viewport.getClientWidth() / size.width,
      viewport.getClientHeight() / size.height,
    );
  }

  /** The scale-1 content frame — what the engine's getCanvasRect expects. */
  function getImageRect(element: { offsetLeft: number; offsetTop: number } | null): Rect {
    const size = getContentSize();
    return {
      x: element?.offsetLeft || 0,
      y: element?.offsetTop || 0,
      width: (size?.width || 0) * idealScale.current,
      height: (size?.height || 0) * idealScale.current,
    };
  }

  return { idealScale, updateIdealScale, getImageRect };
}
