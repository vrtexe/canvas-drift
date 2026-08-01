import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import styles from './Canvas.module.css';
import useLib from './useLib';
import useLocalStorage from './localStorageHook';
import type { CanvasHandle } from './Canvas';
import Viewport, { type ViewportRef } from './Viewport';

type CanvasImgProps = {
  ref?: Ref<CanvasHandle>;
  zoom?: { enabled?: boolean };
  pan?: { enabled?: boolean };
  defaultAspectRatio?: number;
  className?: string;
};

function CanvasImg({
  ref,
  zoom: zoomOpts = {},
  pan: panOpts = {},
}: CanvasImgProps) {
  const { enabled: zoomEnabled = true } = zoomOpts as { enabled: boolean };
  const { enabled: panEnabled = true } = panOpts as { enabled: boolean };

  const viewportRef = useRef<ViewportRef>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [isMoving, setIsMoving] = useState<boolean | null>(null);
  const [imageSrc, setImageSrc] = useLocalStorage<string | null>(
    'imageSrc',
    null,
  );

  const lib = useLib({
    viewport: () => viewportRef.current?.getRect() || null,
    canvas: () => stageRef.current?.getBoundingClientRect() || null,
    zoomEnabled,
    panEnabled,
    onIsMovingChange(value) {
      setIsMoving(value);
    },
    onTransform(transform) {
      setTransformStyle({
        transform: `scale(${transform.scale}) translate(${-transform.origin.x}px, ${-transform.origin.y}px)`,
      });
    },
  });

  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({
    transform: `scale(1) translate(0, 0)`,
  });

  const stageStyle: React.CSSProperties = {
    ...transformStyle,
  };

  // Center the stage once the initial layout is measured.
  useEffect(() => {
    const id = setTimeout(() => lib.reset(), 100);
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
        style={{ cursor: isMoving ? 'grabbing' : lib ? 'grab' : 'default' }}>
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
      </Viewport>
    </div>
  );
}

export default CanvasImg;
