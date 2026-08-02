import { useCallback, useImperativeHandle, useRef, useState } from 'react';
import styles from './Canvas.module.css';
import useLocalStorage from './localStorageHook';
import type { CanvasProps } from './Component';
import { type Transform } from 'canvas-drift';
import type { ViewportRef } from './Viewport';

type CanvasImgProps = CanvasProps;

function CanvasImg({ viewportRef, ref, lib }: CanvasImgProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const idealScale = useRef(1);

  const [imageSrc, setImageSrc] = useLocalStorage<string | null>(
    'imageSrc',
    null,
  );

  const [transformStyle, setTransformStyle] = useState<React.CSSProperties>({
    transform: `scale(1) translate(0, 0)`,
  });

  const draw = useCallback(
    (transform?: Transform) => {
      if (!transform) return;
      setTransformStyle({
        transform: `scale(${transform.scale}) translate(${-transform.origin.x}px, ${-transform.origin.y}px)`,
      });
    },
    [setTransformStyle],
  );

  function updateSize() {
    if (!canvasRef.current || !imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    canvasRef.current.style.width = `${naturalWidth * idealScale.current}px`;
    canvasRef.current.style.height = `${naturalHeight * idealScale.current}px`;
  }

  const calculateIdealScale = useCallback(() => {
    const viewportElement = viewportRef?.current;
    if (!viewportElement || !imgRef.current) return 1;

    const imgWidth = imgRef.current.naturalWidth;
    const imgHeight = imgRef.current.naturalHeight;

    return Math.min(
      viewportElement.getClientWidth() / imgWidth,
      viewportElement.getClientHeight() / imgHeight,
    );
  }, []);

  function updateIdealScale() {
    idealScale.current = calculateIdealScale();
  }

  function handleViewportResize(viewport?: ViewportRef | null) {
    if (!viewport) return;

    updateIdealScale();
    updateSize();
    redraw();
  }

  function onImageLoad() {
    updateIdealScale();
    updateSize();
    redraw();
  }

  const redraw = useCallback(() => {
    draw(lib?.stateService.getTransform());
  }, [draw]);

  const canvasStyle: React.CSSProperties = {
    ...transformStyle,
  };

  useImperativeHandle(ref, () => ({
    draw,
    redraw,
    handleViewportResize,
    clearImage: () => {
      setImageSrc(null);
    },
    getImageRect: () => ({
      x: canvasRef.current?.offsetLeft || 0,
      y: canvasRef.current?.offsetTop || 0,
      width: (imgRef.current?.naturalWidth || 0) * idealScale.current,
      height: (imgRef.current?.naturalHeight || 0) * idealScale.current,
    }),
    setFile: (file) => {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    },
    zoomIn: () => lib?.scaleService.zoomIn(),
    zoomOut: () => lib?.scaleService.zoomOut(),
    center: () => lib?.center(),
    fit: () => lib?.fit(),
  }));

  return (
    <div
      className={`${styles.stage} ${styles.zoomLayer}`}
      ref={canvasRef}
      style={canvasStyle}>
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          className={styles.officeImage}
          draggable={false}
          onLoad={onImageLoad}
        />
      )}
    </div>
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
  );
}

export default CanvasImg;
