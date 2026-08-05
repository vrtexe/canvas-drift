import { useEffect, useImperativeHandle, useRef } from "react";
import type { Renderer, RendererConfig, RendererRef } from "./base";
import type { ViewportRef } from "../Viewport";
import { useAsyncMemo } from "../util/asyncMemo";
import { createImageBitmapSafe } from "../util/image";
import { useIdealScale } from "../util/useIdealScale";
import { type Transform } from "canvas-glide";

export type CanvasRendererProps = RendererConfig<typeof Renderer.Canvas>;

const defaultCanvasStyles: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  height: "100%",
  width: "100%",
};

export function Canvas({ viewportRef, ref, afterDraw, image, lib, container, content }: CanvasRendererProps) {
  const { style: containerStyle, ref: _unusedContainer, ...containerRest } = container ?? {};
  const { style: contentStyle, ref: _unusedContent, ...contentRest } = content ?? {};

  const canvasStyles = {
    ...defaultCanvasStyles,
    ...containerStyle,
    ...contentStyle,
  };

  const imageBitmap = useAsyncMemo(
    () => createImageBitmapSafe(image),
    [image],
    (bitmap) => bitmap?.close(),
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvas = useRef<OffscreenCanvas>(new OffscreenCanvas(0, 0));
  const canvasContext = useRef(canvasRef?.current?.getContext("2d"));

  function applySmoothing(ctx: CanvasRenderingContext2D) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
  }

  useEffect(() => {
    canvasContext.current = canvasRef?.current?.getContext("2d");
    canvasContext.current && applySmoothing(canvasContext.current);
  }, []);

  const { idealScale, updateIdealScale, getImageRect } = useIdealScale(viewportRef, () => ({
    width: offscreenCanvas.current.width,
    height: offscreenCanvas.current.height,
  }));

  useEffect(() => {
    if (!imageBitmap || !offscreenCanvas.current) return;

    updateOffscreenCanvas(imageBitmap);
    handleViewportResize(viewportRef?.current);
    updateIdealScale();

    // Content is measurable now — center the freshly loaded image. fit() only
    // emits when the transform actually changes, so draw explicitly too.
    lib?.fit();
    draw(lib?.stateService.getTransform());
  }, [imageBitmap]);

  function draw(transform?: Transform) {
    if (!canvasRef.current || !offscreenCanvas.current || !transform || !imageBitmap) return;

    const canvas = canvasRef.current;
    const scale = transform.scale;
    const originX = transform.origin.x;
    const originY = transform.origin.y;

    const ctx = canvasContext.current;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    ctx.resetTransform();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ctx.scale(scale * dpr, scale * dpr);
    // ctx.translate(-originX, -originY);;
    const s = scale * dpr;
    ctx.setTransform(s, 0, 0, s, -originX * s, -originY * s);

    ctx.drawImage(
      offscreenCanvas.current,
      0,
      0,
      offscreenCanvas.current.width * idealScale.current,
      offscreenCanvas.current.height * idealScale.current,
    );

    afterDraw?.(transform, externalRef);
  }

  function redraw() {
    draw(lib?.stateService.getTransform());
  }

  function updateOffscreenCanvas(imageBitmap: ImageBitmap) {
    offscreenCanvas.current.width = imageBitmap.width;
    offscreenCanvas.current.height = imageBitmap.height;
    const ctx = offscreenCanvas.current.getContext("2d");
    ctx?.drawImage(imageBitmap, 0, 0);
  }

  function updateSize(width: number, height: number) {
    if (!canvasRef.current) return;
    canvasRef.current.width = width;
    canvasRef.current.height = height;

    if (canvasContext.current) applySmoothing(canvasContext.current);

    updateIdealScale();
  }

  function handleViewportResize(viewport?: ViewportRef | null) {
    if (!viewport) return;

    updateSize(viewport.getWidth(), viewport.getHeight());
    redraw();
  }

  const externalRef: RendererRef[typeof Renderer.Canvas] = {
    getContainerRef: () => canvasRef.current,
    getContentRef: () => canvasRef.current,
    draw,
    handleViewportResize,
    getImageRect: () => getImageRect(canvasRef.current),
  };

  useImperativeHandle(ref, () => externalRef);

  return <canvas style={canvasStyles} ref={canvasRef} {...containerRest} {...contentRest} />;
}

export default Canvas;
