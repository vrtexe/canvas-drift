import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { ViewportRef } from "../Viewport";
import type { Renderer, RendererConfig, RendererRef } from "./base";
import { useAsyncMemo } from "../util/asyncMemo";
import { createImageBitmapSafe } from "../util/image";
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
  const { style: containerStyle, ref: _unusedRef, ...containerRest } = container ?? {};
  const { style: contentStyle, ref: _unused, ...contentRest } = content ?? {};

  const canvasStyles = {
    ...defaultCanvasStyles,
    ...containerStyle,
    ...contentStyle,
  };

  const imageBitmap = useAsyncMemo(() => createImageBitmapSafe(image), [image]);

  const idealScale = useRef(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvas = useRef<OffscreenCanvas>(
    new OffscreenCanvas(imageBitmap?.width || 0, imageBitmap?.height || 0),
  );

  useEffect(() => {
    if (!imageBitmap || !offscreenCanvas.current) return;

    updateOffscreenCanvas(imageBitmap);
    handleViewportResize(viewportRef?.current);
    updateIdealScale();

    draw(lib?.stateService.getTransform());
  }, [imageBitmap]);

  const draw = useCallback(
    (transform?: Transform) => {
      if (!canvasRef.current || !offscreenCanvas.current || !transform || !imageBitmap) return;

      const canvas = canvasRef.current;
      const scale = transform.scale;
      const originX = transform.origin.x;
      const originY = transform.origin.y;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;

      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.scale(scale * dpr, scale * dpr);
      ctx.translate(-originX, -originY);

      ctx.drawImage(
        offscreenCanvas.current,
        0,
        0,
        offscreenCanvas.current.width * idealScale.current,
        offscreenCanvas.current.height * idealScale.current,
      );

      afterDraw?.(transform, externalRef);
    },
    [imageBitmap, offscreenCanvas, idealScale],
  );

  const redraw = useCallback(() => {
    draw(lib?.stateService.getTransform());
  }, [draw]);

  const updateOffscreenCanvas = useCallback(
    (imageBitmap: ImageBitmap) => {
      offscreenCanvas.current.width = imageBitmap.width;
      offscreenCanvas.current.height = imageBitmap.height;
      const offscreen = offscreenCanvas.current;
      const ctx = offscreen.getContext("2d");
      ctx?.drawImage(imageBitmap, 0, 0);
    },
    [offscreenCanvas],
  );

  function updateIdealScale() {
    idealScale.current = calculateIdealScale();
  }

  const calculateIdealScale = useCallback(() => {
    const viewportElement = viewportRef?.current;
    if (!viewportElement) return 1;

    const imgWidth = offscreenCanvas.current.width;
    const imgHeight = offscreenCanvas.current.height;

    return Math.min(viewportElement.getClientWidth() / imgWidth, viewportElement.getClientHeight() / imgHeight);
  }, []);

  function updateSize(width: number, height: number) {
    if (!canvasRef.current) return;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
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
    getImageRect: () => ({
      x: canvasRef.current?.offsetLeft || 0,
      y: canvasRef.current?.offsetTop || 0,
      width: offscreenCanvas.current.width * idealScale.current || 0,
      height: offscreenCanvas.current.height * idealScale.current || 0,
    }),
  };
  useImperativeHandle(ref, () => externalRef);

  return <canvas style={canvasStyles} ref={canvasRef} {...containerRest} {...contentRest} />;
}

export default Canvas;
