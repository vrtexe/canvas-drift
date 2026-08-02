import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ComponentType, Ref } from 'react';
import useLib from './useLib';
import Viewport, { type ViewportRef } from './Viewport';
import {
  type CanvasRef,
  type CanvasProps as CanvasComponentProps,
} from './Component';
import CanvasImg from './CanvasImg';

export type CanvasHandle = {
  setFile: (file: File | null) => void;
  clearFile: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => void;
  fit: () => void;
};

type CanvasProps = {
  ref?: Ref<CanvasHandle>;
  zoom?: { enabled?: boolean };
  pan?: { enabled?: boolean };
  className?: string;

  canvas?: ComponentType<CanvasComponentProps>;
};

function Canvas({
  ref,
  className = '',
  canvas: CanvasComponent = CanvasImg,
}: CanvasProps) {
  const viewportRef = useRef<ViewportRef>(null);
  const canvasRef = useRef<CanvasRef>(null);

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
    setFile: (file) => canvasRef.current?.setFile(file),
    clearFile: () => canvasRef.current?.clearImage?.(),
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
      <CanvasComponent viewportRef={viewportRef} ref={canvasRef} lib={lib} />
    </Viewport>
  );
}

export default Canvas;
