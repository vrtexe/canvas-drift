import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import type { ForwardedRef } from 'react';
import styles from './Canvas.module.css';
import useLib from './useLib';
import useLocalStorage from './localStorageHook';
import type { CanvasHandle } from './Canvas';

type CanvasImgProps = {
  zoom?: { enabled?: boolean };
  pan?: { enabled?: boolean };
  defaultAspectRatio?: number;
  className?: string;
};

function CanvasImg(
  {
    zoom: zoomOpts = {},
    pan: panOpts = {},
    defaultAspectRatio = 16 / 10,
    className = '',
  }: CanvasImgProps,
  ref: ForwardedRef<CanvasHandle>,
) {
  const { enabled: zoomEnabled = true } = zoomOpts as { enabled: boolean };
  const { enabled: panEnabled = true } = panOpts as { enabled: boolean };

  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [imageSrc, setImageSrc] = useLocalStorage<string | null>(
    'imageSrc',
    null,
  );
  const [naturalSize, setNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  const aspectRatio = naturalSize
    ? naturalSize.w / naturalSize.h
    : defaultAspectRatio;

  // Compute the largest rect fitting inside the viewport while preserving AR.
  const recomputeStageSize = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (!vw || !vh) {
      return;
    }
    let w = vw;
    let h = vw / aspectRatio;
    if (h > vh) {
      h = vh;
      w = vh * aspectRatio;
    }
    setStageSize((prev) =>
      Math.round(prev.w) === Math.round(w) &&
      Math.round(prev.h) === Math.round(h)
        ? prev
        : { w, h },
    );
  }, [aspectRatio]);

  // Observe viewport size — this drives the layout on every breakpoint.
  useEffect(() => {
    recomputeStageSize();
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const ro = new ResizeObserver(() => recomputeStageSize());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [recomputeStageSize]);

  // Also react to orientation changes on mobile.
  useEffect(() => {
    const handler = () => recomputeStageSize();
    window.addEventListener('orientationchange', handler);
    return () => window.removeEventListener('orientationchange', handler);
  }, [recomputeStageSize]);

  const handleImgLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) {
      return;
    }
    const next = { w: img.naturalWidth, h: img.naturalHeight };
    setNaturalSize(next);
  }, []);

  const zp = useLib({
    viewport: () => viewportRef.current?.getBoundingClientRect() || null,
    canvas: () => stageRef.current?.getBoundingClientRect() || null,
    zoomEnabled,
    panEnabled,
    onTransform(transform) {
      setTransformStyle({
        transform: `scale(${transform.scale}) translate(${-transform.origin.x}px, ${-transform.origin.y}px)`,
      });
    },
    // draw: (origin, scale) => {
    // },
  });

  const [transformStyle, setTransformStyle] = useState<{
    transform: string;
  }>({
    transform: `scale(1) translate(0, 0)`,
  });

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

  const stageStyle = {
    width: stageSize.w ? `${Math.round(stageSize.w)}px` : '100%',
    height: stageSize.h ? `${Math.round(stageSize.h)}px` : '100%',
    ...transformStyle,
  };

  // Center the stage once the initial layout is measured.
  useEffect(() => {
    const id = setTimeout(() => zp.reset(), 100);
    return () => clearTimeout(id);
  }, []);

  useImperativeHandle(ref, () => ({
    setFile: (file) => {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    },
    clearFile: () => {
      setImageSrc(null);
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
        <div
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
        </div>
        {!imageSrc && (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateTitle}>No image selected</span>
            <span className={styles.emptyStateHint}>
              Use the Upload button to add one
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default forwardRef(CanvasImg);
