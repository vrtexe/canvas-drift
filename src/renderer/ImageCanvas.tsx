import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { type Transform } from "canvas-glide";
import type { ViewportRef } from "../Viewport";
import type { Renderer, RendererConfig, RendererRef } from "./base";
import { useAsyncMemo } from "../util/asyncMemo";
import { createImageDataUrlSafe } from "../util/image";
import { useIdealScale } from "../util/useIdealScale";

export type ImageRendererProps = RendererConfig<typeof Renderer.Image>;

const defaultImageCanvasStyle: React.CSSProperties = {
  position: "relative",
  transformOrigin: "top left",
} as const;

const defaultImageStyle: React.CSSProperties = {
  display: "block",
  height: "100%",
  width: "100%",
};

export function ImageCanvas({
  viewportRef,
  afterDraw,
  children,
  ref,
  image,
  lib,
  container,
  content,
}: ImageRendererProps) {
  const { style: contentStyle, ref: _unusedContent, ...contentRest } = content ?? {};
  const { style: containerStyle, ref: _unusedContainer, ...containerRest } = container ?? {};
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imageVisibility, setImageVisibility] = useState<React.CSSProperties["visibility"]>("hidden");

  const imageSrc = useAsyncMemo(() => createImageDataUrlSafe(image), [image]);

  const { idealScale, updateIdealScale, getImageRect } = useIdealScale(viewportRef, () =>
    imgRef.current ? { width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight } : null,
  );

  function draw(transform?: Transform) {
    if (!transform || !canvasRef.current) return;
    canvasRef.current.style.transform = `scale(${transform.scale}) translate(${-transform.origin.x}px, ${-transform.origin.y}px)`;
    afterDraw?.(transform, externalRef);
  }

  function redraw() {
    draw(lib?.stateService.getTransform());
  }

  function updateSize() {
    if (!canvasRef.current || !imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    canvasRef.current.style.width = `${naturalWidth * idealScale.current}px`;
    canvasRef.current.style.height = `${naturalHeight * idealScale.current}px`;
  }

  function handleViewportResize(viewport?: ViewportRef | null) {
    if (!viewport) return;

    updateIdealScale();
    updateSize();
    redraw();
  }

  function onImageLoad() {
    updateIdealScale();
    updateSize();

    // Content is measurable now — center the freshly loaded image. fit() only
    // emits when the transform actually changes, so redraw explicitly too.
    lib?.fit();
    redraw();
    setImageVisibility("visible");
  }

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth) {
      onImageLoad();
    }
  }, [imageSrc]);

  const canvasStyle: React.CSSProperties = {
    ...defaultImageCanvasStyle,
    ...containerStyle,
  };

  const externalRef: RendererRef[typeof Renderer.Image] = {
    getContainerRef: () => canvasRef.current,
    getContentRef: () => imgRef.current,
    draw,
    handleViewportResize,
    getImageRect: () => getImageRect(canvasRef.current),
  };

  useImperativeHandle(ref, () => externalRef);

  const imageStyle: React.CSSProperties = {
    ...defaultImageStyle,
    visibility: imageVisibility,
    ...contentStyle,
  };

  return (
    <div ref={canvasRef} style={canvasStyle} {...containerRest}>
      <img
        hidden={!imageSrc}
        style={imageStyle}
        ref={imgRef}
        src={imageSrc || undefined}
        draggable={false}
        onLoad={onImageLoad}
        {...contentRest}
      />
      {children}
    </div>
  );
}
