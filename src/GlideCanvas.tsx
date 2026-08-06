import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { useGlideCanvas, type GlideCanvasInstance, type GlideCanvasOptions } from "./useGlideCanvas";
import { Viewport, type ViewportRef } from "./Viewport";
import { Canvas } from "./renderer/Canvas";
import { ImageCanvas } from "./renderer/ImageCanvas";
import { HtmlCanvas } from "./renderer/HtmlCanvas";
import type { ViewportOptions } from "./Viewport";
import { Renderer, type CanvasOptions, type RendererRef } from "./renderer/base";
import { copyTransform } from "canvas-glide";

export type BaseGlideCanvasRef<R> = GlideCanvasInstance & {
  viewportRef?: ViewportRef | null;
  canvasRef?: R | null;
};
export type GlideCanvasRef<T extends Renderer = Renderer> = BaseGlideCanvasRef<RendererRef[T]>;

export type BaseGlideCanvasProps = {
  config?: GlideCanvasOptions;
  viewportConfig?: ViewportOptions;
  image?: Blob | null;
  ref?: Ref<GlideCanvasRef>;
};

/**
 * Discriminated union over `renderer`: call sites with a literal renderer get
 * their exact canvasConfig checked. The last arm supports a runtime-decided
 * renderer (e.g. tab switching); it cannot accept canvasConfig, because no
 * single config shape fits all renderers. For fully custom rendering, compose
 * the primitives directly: useGlideCanvas + Viewport + your own component.
 */
export type GlideCanvasProps =
  | (BaseGlideCanvasProps & {
      renderer?: typeof Renderer.Canvas;
      canvasConfig?: CanvasOptions<typeof Renderer.Canvas>;
    })
  | (BaseGlideCanvasProps & {
      renderer: typeof Renderer.Image;
      canvasConfig?: CanvasOptions<typeof Renderer.Image>;
    })
  | (BaseGlideCanvasProps & {
      renderer: typeof Renderer.Html;
      canvasConfig?: CanvasOptions<typeof Renderer.Html>;
    })
  | (BaseGlideCanvasProps & {
      renderer: Renderer;
      canvasConfig?: undefined;
    });

export function GlideCanvas(props: GlideCanvasProps) {
  const viewportRef = useRef<ViewportRef>(null);
  const canvasRef = useRef<RendererRef[Renderer] | null>(null);
  const drawRafId = useRef<number | null>(null);

  // A callback ref instead of a shared RefObject: each renderer's specific
  // CanvasRef assigns soundly INTO the union-typed ref, whereas a RefObject
  // typed as the union could not be handed to a renderer expecting only its
  // own instantiation.
  const setCanvasRef = (instance: RendererRef[Renderer] | null) => {
    canvasRef.current = instance;
  };

  const [isMoving, setIsMoving] = useState(false);

  const { config } = props;

  const lib = useGlideCanvas({
    ...config,
    getViewportRect: () => viewportRef.current?.getRect() || null,
    getCanvasRect: () => canvasRef.current?.getImageRect?.() || null,
    move: {
      ...config?.move,
      onIsMovingChange(isMoving) {
        setIsMoving(isMoving);
        config?.move?.onIsMovingChange?.(isMoving);
      },
    },
    state: {
      ...config?.state,
      onTransformChange() {
        scheduleDraw();
      },
    },
  });

  function onViewportResize(viewportRef: ViewportRef) {
    canvasRef.current?.handleViewportResize?.(viewportRef);
    props.viewportConfig?.onResize?.(viewportRef);
  }

  useImperativeHandle(props.ref, () => ({
    viewportRef: viewportRef.current,
    canvasRef: canvasRef.current,
    ...lib,
  }));

  function scheduleDraw() {
    if (drawRafId.current !== null) return; // one already queued
    drawRafId.current = requestAnimationFrame(() => {
      drawRafId.current = null;
      const transform = lib.stateService.getTransform();
      canvasRef.current?.draw?.(transform);
      config?.state?.onTransformChange?.(copyTransform(transform));
    });
  }

  useEffect(() => {
    return () => {
      if (drawRafId.current !== null) cancelAnimationFrame(drawRafId.current);
    };
  }, []);

  return (
    <Viewport
      ref={viewportRef}
      lib={lib}
      {...props.viewportConfig}
      style={{
        cursor: isMoving ? "grabbing" : lib ? "grab" : "default",
        ...props.viewportConfig?.style,
      }}
      onResize={onViewportResize}
    >
      {props.renderer === Renderer.Image ? (
        <ImageCanvas
          viewportRef={viewportRef}
          ref={setCanvasRef}
          lib={lib}
          image={props.image}
          {...props.canvasConfig}
        />
      ) : props.renderer === Renderer.Html ? (
        <HtmlCanvas
          viewportRef={viewportRef}
          ref={setCanvasRef}
          lib={lib}
          image={props.image}
          {...props.canvasConfig}
        />
      ) : (
        <Canvas viewportRef={viewportRef} ref={setCanvasRef} lib={lib} image={props.image} {...props.canvasConfig} />
      )}
    </Viewport>
  );
}
