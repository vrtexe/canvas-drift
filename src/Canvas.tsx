import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import useLib from './useLib';
import Viewport, { type ViewportRef } from './Viewport';
import DrawCanvas, { type CanvasRef } from './Component';

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
};

function Canvas({
  ref,
  zoom: zoomOpts = {},
  pan: panOpts = {},
  className = '',
}: CanvasProps) {
  const { enabled: zoomEnabled = true } = zoomOpts as { enabled: boolean };
  const { enabled: panEnabled = true } = panOpts as { enabled: boolean };

  const viewportRef = useRef<ViewportRef>(null);
  const canvasRef = useRef<CanvasRef>(null);

  const [isMoving, setIsMoving] = useState(false);

  const lib = useLib({
    viewport: () => viewportRef.current?.getRect() || null,
    canvas: () => canvasRef.current?.getImageRect() || null,
    zoomEnabled,
    panEnabled,
    onTransform(transform) {
      canvasRef.current?.draw(transform);
    },
    onIsMovingChange(isMoving) {
      setIsMoving(isMoving);
    },
  });

  function onViewportResize(viewportRef: ViewportRef) {
    const canvas = canvasRef.current?.getCanvas();
    if (!viewportRef || !canvas) return;

    canvasRef.current?.updateSize(
      viewportRef.getWidth(),
      viewportRef.getHeight(),
    );
    canvasRef.current?.redraw();
  }

  // const viewportStyle = {
  // cursor: zp.isMoving ? 'grabbing' : zp ? 'grab' : 'default',
  // };

  useEffect(() => {
    const id = setTimeout(() => lib.reset(), 100);
    return () => clearTimeout(id);
  }, []);

  useImperativeHandle(ref, () => ({
    setFile: (file) => canvasRef.current?.setFile(file),
    clearFile: () => canvasRef.current?.setImageBitmap(null),
    zoomIn: () => lib.scaleService.zoomIn(),
    zoomOut: () => lib.scaleService.zoomOut(),
    center: () => lib.center(),
    fit: () => lib.fit(),
  }));

  return (
    <div style={{ width: '100dvw', height: '100dvh', overflow: 'hidden' }}>
      <Viewport
        ref={viewportRef}
        lib={lib}
        className={className}
        style={{
          cursor: isMoving ? 'grabbing' : lib ? 'grab' : 'default',
        }}
        onResize={onViewportResize}>
        <DrawCanvas viewportRef={viewportRef} ref={canvasRef} lib={lib} />
      </Viewport>
      {/* {!imageBitmap && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateTitle}>No image selected</span>
            <span className={styles.emptyStateHint}>
              Use the Upload button to add one
            </span>
          </div>
        )} */}
    </div>
  );
}

export default Canvas;
