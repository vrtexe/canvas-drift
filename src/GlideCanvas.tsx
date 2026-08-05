import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { ComponentType, Ref } from "react";
import { useGlideCanvas, type GlideCanvasInstance, type GlideCanvasOptions } from "./useGlideCanvas";
import { Viewport, type ViewportRef } from "./Viewport";
import { Canvas } from "./renderer/Canvas";
import { ImageCanvas } from "./renderer/ImageCanvas";
import { HtmlCanvas } from "./renderer/HtmlCanvas";
import type { ViewportOptions } from "./Viewport";
import { Renderer, type BaseRenderConfig, type CanvasOptions, type CanvasRef, type RendererRef } from "./renderer/base";

export type BaseGlideCanvasRef<R> = GlideCanvasInstance & {
  viewportRef?: ViewportRef | null;
  canvasRef?: R | null;
};
export type GlideCanvasRef<T extends Renderer> = BaseGlideCanvasRef<RendererRef[T]>;

export type BaseGlideCanvasProps = {
  config?: GlideCanvasOptions;
  viewportConfig?: ViewportOptions;
  image?: Blob | null;
};

export type GlideCanvasProps<C, R extends CanvasRef<any, any> = CanvasRef<Element, Element>> =
  | (BaseGlideCanvasProps & {
      renderer: typeof Renderer.Canvas;
      ref?: Ref<GlideCanvasRef<typeof Renderer.Canvas>>;
      canvasConfig?: CanvasOptions<typeof Renderer.Canvas>;
    })
  | (BaseGlideCanvasProps & {
      renderer: typeof Renderer.Image;
      ref?: Ref<GlideCanvasRef<typeof Renderer.Image>>;
      canvasConfig?: CanvasOptions<typeof Renderer.Image>;
    })
  | (BaseGlideCanvasProps & {
      renderer: typeof Renderer.Html;
      ref?: Ref<GlideCanvasRef<typeof Renderer.Html>>;
      canvasConfig?: CanvasOptions<typeof Renderer.Html>;
    })
  | (BaseGlideCanvasProps & {
      renderer?: null | undefined | typeof Renderer.Custom;
      ref?: Ref<BaseGlideCanvasRef<R>>;
      canvasConfig?: BaseRenderConfig<R> & C;
      canvas?: ComponentType<BaseRenderConfig<R>>;
    })
  | (BaseGlideCanvasProps & {
      renderer?: Renderer;
      ref?: Ref<BaseGlideCanvasRef<R>>;
      canvasConfig?: BaseRenderConfig<R> & C;
      canvas?: ComponentType<BaseRenderConfig<R>>;
    });

export function GlideCanvas<C, R extends CanvasRef<any, any> = CanvasRef<Element, Element>>(
  props: GlideCanvasProps<C, R>,
) {
  const viewportRef = useRef<ViewportRef>(null);
  const canvasRef = useRef<RendererRef[Renderer] | null>(null);
  const customCanvasRef = !props.renderer || props.renderer === Renderer.Custom ? useRef<R | null>(null) : null;

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
      onTransformChange(transform) {
        canvasRef.current?.draw?.(transform);
        config?.state?.onTransformChange?.(transform);
      },
    },
  });

  function onViewportResize(viewportRef: ViewportRef) {
    canvasRef.current?.handleViewportResize?.(viewportRef);
  }

  useEffect(() => {
    const id = setTimeout(() => lib.reset(), 100);
    return () => clearTimeout(id);
  }, []);

  function setRef<T extends Ref<GlideCanvasRef<R>>, R extends Renderer>(ref: T) {
    useImperativeHandle(ref, () => {
      return {
        viewportRef: viewportRef.current,
        canvasRef: canvasRef.current as RendererRef[R],
        ...lib,
      };
    });
  }

  if (props.renderer && props.ref) {
    setRef(props.ref);
  } else if (!props.renderer && props.canvas) {
    useImperativeHandle(props.ref, () => ({
      viewportRef: viewportRef.current,
      canvasRef: customCanvasRef?.current,
      ...lib,
    }));
  }

  return (
    <Viewport
      ref={viewportRef}
      lib={lib}
      style={{
        ...props.viewportConfig?.style,
        cursor: isMoving ? "grabbing" : lib ? "grab" : "default",
      }}
      onResize={onViewportResize}
      {...props.viewportConfig}
    >
      {!props.renderer && props.canvas ? (
        <props.canvas
          ref={customCanvasRef}
          viewportRef={viewportRef}
          lib={lib}
          image={props.image}
          {...props.canvasConfig}
        />
      ) : (
        <>
          {props.renderer === Renderer.Image && (
            <ImageCanvas
              viewportRef={viewportRef}
              ref={setCanvasRef}
              lib={lib}
              image={props.image}
              {...props.canvasConfig}
            />
          )}{" "}
          {props.renderer === Renderer.Html && (
            <HtmlCanvas
              viewportRef={viewportRef}
              ref={setCanvasRef}
              lib={lib}
              image={props.image}
              {...props.canvasConfig}
            />
          )}
          {props.renderer === Renderer.Canvas && (
            <Canvas
              viewportRef={viewportRef}
              ref={setCanvasRef}
              lib={lib}
              image={props.image}
              {...props.canvasConfig}
            />
          )}
        </>
      )}
    </Viewport>
  );
}
