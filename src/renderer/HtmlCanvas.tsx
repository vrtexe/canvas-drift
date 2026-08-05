import { useImperativeHandle, useRef } from "react";
import type { Transform } from "canvas-glide";
import type { Renderer, RendererConfig, RendererRef } from "./base";
import { useAsyncMemo } from "../util/asyncMemo";
import { createImageDataUrlSafe } from "../util/image";
import { useIdealScale } from "../util/useIdealScale";

export type HtmlRendererProps = RendererConfig<typeof Renderer.Html>;

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
export function HtmlCanvas({
  viewportRef,
  afterDraw,
  children,
  ref,
  image,
  lib,
  container,
  content,
}: HtmlRendererProps) {
  const { style: containerStyle, ref: _unusedContainer, ...containerRest } = container ?? {};
  const { style: contentStyle, ref: _unusedContent, ...contentRest } = content ?? {};
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const imageSrc = useAsyncMemo(() => createImageDataUrlSafe(image), [image]);

  const { idealScale, updateIdealScale, getImageRect } = useIdealScale(viewportRef, () =>
    imgRef.current ? { width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight } : null,
  );

  function draw(transform?: Transform) {
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

    afterDraw?.(transform, externalRef);
  }

  function redraw() {
    draw(lib?.stateService.getTransform());
  }

  function handleViewportResize() {
    updateIdealScale();
    redraw();
  }

  function onImageLoad() {
    updateIdealScale();

    // Content is measurable now — center the freshly loaded image. fit() only
    // emits when the transform actually changes, so redraw explicitly too.
    lib?.fit();
    redraw();
  }

  const externalRef: RendererRef[typeof Renderer.Html] = {
    getContainerRef: () => scrollerRef.current,
    getContentRef: () => imgRef.current,
    draw,
    handleViewportResize,
    getImageRect: () => getImageRect(scrollerRef.current),
  };

  useImperativeHandle(ref, () => externalRef);

  const scrollerStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "relative",
    ...containerStyle,
  };

  const imageStyle: React.CSSProperties = {
    display: "block",
    boxSizing: "content-box",
    ...contentStyle,
  };

  return (
    <div style={scrollerStyle} ref={scrollerRef} {...containerRest}>
      <img
        ref={imgRef}
        src={imageSrc || undefined}
        style={imageStyle}
        draggable={false}
        onLoad={onImageLoad}
        {...contentRest}
      />
      {children}
    </div>
  );
}
