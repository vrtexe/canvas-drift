import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import type { ForwardedRef } from 'react';
import styles from './Canvas.module.css';
import useLib from './useLib';
import useLocalStorageImage from './localStorageImageHook';
import type { Transform } from './lib/engine';

export type CanvasHandle = {
  setFile: (file: File | null) => void;
  clearFile: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => void;
  fit: () => void;
};

type CanvasProps = {
  zoom?: { enabled?: boolean };
  pan?: { enabled?: boolean };
  className?: string;
};

function Canvas(
  { zoom: zoomOpts = {}, pan: panOpts = {}, className = '' }: CanvasProps,
  ref: ForwardedRef<CanvasHandle>,
) {
  const { enabled: zoomEnabled = true } = zoomOpts as { enabled: boolean };
  const { enabled: panEnabled = true } = panOpts as { enabled: boolean };

  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imageBitmap, setImageBitmap] =
    useLocalStorageImage<ImageBitmap | null>('imageBitmap', null);

  const offscreenCanvas = useRef<OffscreenCanvas>(
    new OffscreenCanvas(imageBitmap?.width || 0, imageBitmap?.height || 0),
  );

  useEffect(() => {
    if (!imageBitmap) return;
    offscreenCanvas.current!.width = imageBitmap.width;
    offscreenCanvas.current!.height = imageBitmap.height;
    const offscreen = offscreenCanvas.current;
    const ctx = offscreen.getContext('2d');
    ctx?.drawImage(imageBitmap, 0, 0);

    draw(zp.stateService.getTransform());
  }, [imageBitmap]);

  const zp = useLib({
    viewport: () => viewportRef.current?.getBoundingClientRect() || null,
    canvas: () => ({
      x: canvasRef.current?.offsetLeft || 0,
      y: canvasRef.current?.offsetTop || 0,
      width:
        offscreenCanvas.current?.width *
          (viewportRef.current?.clientWidth! / offscreenCanvas.current.width) ||
        0,
      height:
        offscreenCanvas.current?.height *
          (viewportRef.current?.clientWidth! / offscreenCanvas.current.width) ||
        0,
    }),
    zoomEnabled,
    panEnabled,
    onTransform(transform) {
      draw(transform);
    },
  });

  // const baseScale = {};
  const draw = useCallback(
    (transform: Transform) => {
      if (!canvasRef.current || !offscreenCanvas) return;
      const canvas = canvasRef.current;
      const scale = transform.scale;
      const originX = transform.origin.x;
      const originY = transform.origin.y;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;

      ctx.resetTransform();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // High-quality resampling so large downscales (zoomed out) stay sharp
      // instead of aliasing/blurring.
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const idealScale =
        viewportRef.current?.clientWidth! / offscreenCanvas.current.width;
      // Fold the device pixel ratio into the transform so we render at the
      // display's real resolution. origin/scale stay in CSS-pixel units, which
      // is what the gesture engine works in.
      ctx.scale(scale * dpr, scale * dpr);
      ctx.translate(-originX, -originY);

      ctx.drawImage(
        offscreenCanvas.current,
        0,
        0,
        offscreenCanvas.current.width * idealScale,
        offscreenCanvas.current.height * idealScale,
      );
    },
    [imageBitmap, offscreenCanvas],
  );

  const redraw = useCallback(() => {
    draw(zp.stateService.getTransform());
  }, [draw]);

  useEffect(() => {
    if (!viewportRef.current) return;

    function updateCanvasSize() {
      if (!viewportRef.current || !canvasRef.current) return;
      const width =
        viewportRef.current!.clientWidth * (window.devicePixelRatio || 1);
      const height =
        viewportRef.current!.clientHeight * (window.devicePixelRatio || 1);

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      redraw();
    }
    const ro = new ResizeObserver(updateCanvasSize);
    ro.observe(viewportRef.current);

    return () => ro.disconnect();
  }, []);

  const viewportStyle = {
    // cursor: zp.isMoving ? 'grabbing' : zp ? 'grab' : 'default',
  };

  useEffect(() => {
    const viewportEl = viewportRef.current;

    viewportEl?.addEventListener('wheel', zp.onWheel, { passive: false });

    return () => {
      viewportEl?.removeEventListener('wheel', zp.onWheel);
    };
  }, [zp.onWheel]);

  useEffect(() => {
    const id = setTimeout(() => zp.reset(), 100);
    return () => clearTimeout(id);
  }, []);

  useImperativeHandle(ref, () => ({
    setFile: async (file) => {
      if (!file) return;
      setImageBitmap(file ? await createImageBitmap(file) : null);
    },
    clearFile: () => {
      setImageBitmap(null);
    },
    zoomIn: () => zp.scaleService.zoomIn(),
    zoomOut: () => zp.scaleService.zoomOut(),
    center: () => zp.center(),
    fit: () => zp.fit(),
  }));

  return (
    <div style={{ width: '100dvw', height: '100dvh', overflow: 'hidden' }}>
      <div
        className={`${styles.viewport}${className ? ` ${className}` : ''}`}
        ref={viewportRef}
        style={viewportStyle}
        onPointerDown={(e) => zp.onPointerDown(e as unknown as PointerEvent)}
        onPointerMove={(e) => zp.onPointerMove(e as unknown as PointerEvent)}
        onPointerUp={(e) => zp.onPointerUp(e as unknown as PointerEvent)}
        onPointerLeave={(e) => zp.onPointerUp(e as unknown as PointerEvent)}
        onPointerCancel={(e) => zp.onPointerUp(e as unknown as PointerEvent)}>
        {imageBitmap && (
          <canvas
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: '100%',
            }}
            ref={canvasRef}
            width={
              viewportRef.current!.clientWidth * (window.devicePixelRatio || 1)
            }
            height={
              viewportRef.current!.clientHeight * (window.devicePixelRatio || 1)
            }
          />
        )}
        {!imageBitmap && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateTitle}>No image selected</span>
            <span className={styles.emptyStateHint}>
              Use the Upload button to add one
            </span>
          </div>
        )}
        {/* <div
          className={`${styles.stage} ${styles.zoomLayer}`}
          ref={stageRef}
          style={stageStyle}>
          {imageSrc && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Office floor plan"
              className={styles.officeImage}
              draggable={false}
              onLoad={handleImgLoad}
            />
          )}
        </div> */}
      </div>
    </div>
  );
}

export default forwardRef(Canvas);
