import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { type Transform } from "canvas-glide";
import type { ViewportRef } from "../Viewport";
import type { Renderer, RendererConfig, RendererRef } from "./base";
import { useAsyncMemo } from "../util/asyncMemo";
import { createImageDataUrlSafe } from "../util/image";

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

export function ImageCanvas({ viewportRef, afterDraw, ref, image, lib, container, content }: ImageRendererProps) {
  const { style: contentStyle, ref: _unused_content, ...contentRest } = content ?? {};
  const { style: containerStyle, ref: _unused_container, ...containerRest } = container ?? {};
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const idealScale = useRef(1);

  const [imageVisibility, setImageVisibility] = useState<React.CSSProperties["visibility"]>("hidden");

  const imageSrc = useAsyncMemo(() => createImageDataUrlSafe(image), [image]);

  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({
    transform: `scale(1) translate(0, 0)`,
  });

  const draw = useCallback(
    (transform?: Transform) => {
      if (!transform) return;
      setTransformStyle({
        transform: `scale(${transform.scale}) translate(${-transform.origin.x}px, ${-transform.origin.y}px)`,
      });

      afterDraw?.(transform, externalRef);
    },
    [setTransformStyle, afterDraw],
  );

  const updateSize = useCallback(() => {
    if (!canvasRef.current || !imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    canvasRef.current.style.width = `${naturalWidth * idealScale.current}px`;
    canvasRef.current.style.height = `${naturalHeight * idealScale.current}px`;
  }, []);

  const calculateIdealScale = useCallback(() => {
    const viewportElement = viewportRef?.current;
    if (!viewportElement || !imgRef.current) return 1;

    const imgWidth = imgRef.current.naturalWidth;
    const imgHeight = imgRef.current.naturalHeight;

    return Math.min(viewportElement.getClientWidth() / imgWidth, viewportElement.getClientHeight() / imgHeight);
  }, []);

  function updateIdealScale() {
    idealScale.current = calculateIdealScale();
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
    redraw();
    setImageVisibility("visible");
  }

  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth) {
      onImageLoad();
    }
  }, [imageSrc]);

  const redraw = useCallback(() => {
    draw(lib?.stateService.getTransform());
  }, [draw]);

  const canvasStyle: React.CSSProperties = {
    ...defaultImageCanvasStyle,
    ...transformStyle,
    ...containerStyle,
  };

  const externalRef: RendererRef[typeof Renderer.Image] = {
    getContainerRef: () => canvasRef.current,
    getContentRef: () => imgRef.current,
    draw,
    handleViewportResize,
    getImageRect: () => ({
      x: canvasRef.current?.offsetLeft || 0,
      y: canvasRef.current?.offsetTop || 0,
      width: (imgRef.current?.naturalWidth || 0) * idealScale.current,
      height: (imgRef.current?.naturalHeight || 0) * idealScale.current,
    }),
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
    </div>
  );
}
