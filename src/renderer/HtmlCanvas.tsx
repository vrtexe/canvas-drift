import { useCallback, useImperativeHandle, useRef } from 'react';
import type { Transform } from 'canvas-drift';
import type { RendererConfig } from './base';
import { useAsyncMemo } from '../util/asyncMemo';
import { createImageDataUrlSafe } from '../util/image';

type HtmlCanvasProps = RendererConfig;

/**
 * Scroll-based renderer: no CSS transforms and no <canvas>.
 * Zoom resizes the <img> element itself (the browser re-rasterizes at the
 * layout size, so it stays sharp — unlike transformed layers on Safari) and
 * pan is a programmatic scroll of an overflow:hidden box (an element does not
 * need visible scrollbars to be scrollable via scrollTo). The img's padding
 * carries one viewport of slack on every side — a scroll range only exists
 * where a descendant box occupies it, and padding is part of the img's border
 * box — so the image can be panned fully off-screen in every direction.
 */
export function HtmlCanvas({ viewportRef, ref, lib, image }: HtmlCanvasProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const idealScale = useRef(1);
  const syncingOrigin = useRef(false);

  const imageSrc = useAsyncMemo(() => createImageDataUrlSafe(image), [image]);

  const calculateIdealScale = useCallback(() => {
    const viewportElement = viewportRef?.current;
    if (!viewportElement || !imgRef.current?.naturalWidth) return 1;

    const imgWidth = imgRef.current.naturalWidth;
    const imgHeight = imgRef.current.naturalHeight;

    return Math.min(
      viewportElement.getClientWidth() / imgWidth,
      viewportElement.getClientHeight() / imgHeight,
    );
  }, []);

  function updateIdealScale() {
    idealScale.current = calculateIdealScale();
  }

  const draw = useCallback(
    (transform?: Transform) => {
      const scroller = scrollerRef.current;
      const img = imgRef.current;
      const viewport = viewportRef?.current;
      if (!transform || !scroller || !img?.naturalWidth || !viewport) return;

      const { scale, origin } = transform;
      const width = img.naturalWidth * idealScale.current * scale;
      const height = img.naturalHeight * idealScale.current * scale;

      // One viewport of slack on every side of the image, carried by the
      // img's own padding (box-sizing: content-box, so width stays the
      // image size). The image can be panned fully off-screen before the
      // scroll range clamps, and negative origins (image smaller than the
      // viewport, centered) are representable as scroll positions.
      const padX = viewport.getClientWidth();
      const padY = viewport.getClientHeight();

      img.style.width = `${width}px`;
      img.style.height = `${height}px`;
      img.style.padding = `${padY}px ${padX}px`;
      scroller.scrollTo(padX + origin.x * scale, padY + origin.y * scale);

      if (syncingOrigin.current || !lib) return;

      // The browser clamps the scroll position to the scrollable range. Feed
      // the clamped value back into the engine so its origin cannot drift
      // past the padded range (which would create a dead zone when panning
      // back).
      const next = {
        x: (scroller.scrollLeft - padX) / scale,
        y: (scroller.scrollTop - padY) / scale,
      };
      if (next.x !== origin.x || next.y !== origin.y) {
        syncingOrigin.current = true;
        lib.stateService.setOrigin(next);
        syncingOrigin.current = false;
      }
    },
    [lib, viewportRef],
  );

  const redraw = useCallback(() => {
    draw(lib?.stateService.getTransform());
  }, [draw, lib]);

  function handleViewportResize() {
    updateIdealScale();
    redraw();
  }

  function onImageLoad() {
    updateIdealScale();
    redraw();
  }

  useImperativeHandle(ref, () => ({
    draw,
    redraw,
    handleViewportResize,
    getImageRect: () => ({
      x: scrollerRef.current?.offsetLeft || 0,
      y: scrollerRef.current?.offsetTop || 0,
      width: (imgRef.current?.naturalWidth || 0) * idealScale.current,
      height: (imgRef.current?.naturalHeight || 0) * idealScale.current,
    }),
    zoomIn: () => lib?.scaleService.zoomIn(),
    zoomOut: () => lib?.scaleService.zoomOut(),
    center: () => lib?.center(),
    fit: () => lib?.fit(),
  }));

  const scrollerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    position: 'relative',
  };

  const imageStyle: React.CSSProperties = {
    display: 'block',
    boxSizing: 'content-box',
  };

  return (
    <div style={scrollerStyle} ref={scrollerRef}>
      <img
        ref={imgRef}
        src={imageSrc || undefined}
        style={imageStyle}
        draggable={false}
        onLoad={onImageLoad}
      />
    </div>
  );
}
