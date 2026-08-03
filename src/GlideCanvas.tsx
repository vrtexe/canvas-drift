import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentType, Ref } from 'react';
import useLib from './useLib';
import { Viewport, type ViewportRef } from './Viewport';
import Canvas, {
  type CanvasProps as CanvasComponentProps,
  type CanvasProps,
} from './renderer/Canvas';
import { ImageCanvas } from './renderer/ImageCanvas';
import { HtmlCanvas } from './renderer/HtmlCanvas';
import type { CanvasRef } from './renderer/base';

export type Renderer = (typeof Renderer)[keyof typeof Renderer];
export const Renderer = Object.freeze({
  Canvas: 'canvas',
  Image: 'image',
  Html: 'html',
} as const);

export const RendererComponentMap: Record<
  Renderer,
  ComponentType<CanvasProps>
> = Object.freeze({
  [Renderer.Canvas]: Canvas,
  [Renderer.Image]: ImageCanvas,
  [Renderer.Html]: HtmlCanvas,
} as const);

export type GlideCanvasHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => void;
  fit: () => void;
};

export type GlideCanvasProps = {
  ref?: Ref<GlideCanvasHandle>;
  zoom?: { enabled?: boolean };
  pan?: { enabled?: boolean };
  className?: string;
  renderer?: Renderer;
  image?: Blob | null;

  canvas?: ComponentType<CanvasComponentProps>;
};

export function GlideCanvas({
  ref,
  className = '',
  image,
  renderer = Renderer.Canvas,
  canvas: CustomCanvas,
}: GlideCanvasProps) {
  const viewportRef = useRef<ViewportRef>(null);
  const canvasRef = useRef<CanvasRef>(null);

  const Renderer = RendererComponentMap[renderer];

  const [isMoving, setIsMoving] = useState(false);

  const lib = useLib({
    viewport: () => viewportRef.current?.getRect() || null,
    canvas: () => canvasRef.current?.getImageRect?.() || null,
    onTransform(transform) {
      canvasRef.current?.draw(transform);
    },
    onIsMovingChange(isMoving) {
      setIsMoving(isMoving);
    },
  });

  function onViewportResize(viewportRef: ViewportRef) {
    canvasRef.current?.handleViewportResize?.(viewportRef);
  }

  useEffect(() => {
    const id = setTimeout(() => lib.reset(), 100);
    return () => clearTimeout(id);
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn: () => lib.scaleService.zoomIn(),
    zoomOut: () => lib.scaleService.zoomOut(),
    center: () => lib.center(),
    fit: () => {},
  }));

  return (
    <Viewport
      ref={viewportRef}
      lib={lib}
      className={className}
      style={{
        cursor: isMoving ? 'grabbing' : lib ? 'grab' : 'default',
      }}
      onResize={onViewportResize}>
      {CustomCanvas ? (
        <CustomCanvas />
      ) : (
        <Renderer
          viewportRef={viewportRef}
          ref={canvasRef}
          lib={lib}
          image={image}
        />
      )}
    </Viewport>
  );
}

//     {!imageSrc && (
//       <div className={styles.emptyState}>
//         <span className={styles.emptyStateTitle}>No image selected</span>
//         <span className={styles.emptyStateHint}>
//           Use the Upload button to add one
//         </span>
//       </div>
//     )}
//   </Viewport>
// </div>
