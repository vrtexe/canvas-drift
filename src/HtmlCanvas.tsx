import { useCallback, useImperativeHandle, useRef } from 'react';
import styles from './Canvas.module.css';
import useLocalStorage from './localStorageHook';
import type { CanvasProps } from './Component';
import type { Transform } from 'canvas-drift';

type HtmlCanvasProps = CanvasProps;

/**
 * Scroll-based renderer: no CSS transforms and no <canvas>.
 * Zoom resizes the <img> element itself (the browser re-rasterizes at the
 * layout size, so it stays sharp — unlike transformed layers on Safari) and
 * pan is a programmatic scroll of an overflow:hidden box (an element does not
 * need visible scrollbars to be scrollable via scrollTo). The stage carries a
 * viewport of slack on every side so the image can be panned off-screen.
 */
function HtmlCanvas({ viewportRef, ref, lib }: HtmlCanvasProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const idealScale = useRef(1);
  const syncingOrigin = useRef(false);

  const [imageSrc, setImageSrc] = useLocalStorage<string | null>(
    'imageSrc',
    null,
  );

  const calculateIdealScale = useCallback(() => {
    const viewportElement = viewportRef?.current;
    if (!viewportElement || !imgRef.current?.naturalWidth) return 1;

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

  const draw = useCallback(
    (transform?: Transform) => {
      const scroller = scrollerRef.current;
      const stage = canvasRef.current;
      const img = imgRef.current;
      const viewport = viewportRef?.current;
      if (!transform || !scroller || !stage || !img?.naturalWidth || !viewport)
        return;

      const { scale, origin } = transform;
      const width = img.naturalWidth * idealScale.current * scale;
      const height = img.naturalHeight * idealScale.current * scale;

      // One viewport of slack on every side of the image: the stage is
      // scaled size + 2×viewport, so the image can be panned fully
      // off-screen before the scroll range clamps. This also makes negative
      // origins (image smaller than viewport, centered) representable as
      // scroll positions.
      const padX = viewport.getClientWidth();
      const padY = viewport.getClientHeight();

      stage.style.width = `${width + padX * 2}px`;
      stage.style.height = `${height + padY * 2}px`;
      img.style.width = `${width}px`;
      img.style.height = `${height}px`;
      img.style.left = `${padX}px`;
      img.style.top = `${padY}px`;
      scroller.scrollTo(padX + origin.x * scale, padY + origin.y * scale);

      if (syncingOrigin.current || !lib) return;

      // The browser clamps the scroll position to the scrollable range. Feed
      // the clamped value back into the engine so its origin cannot drift
      // past the padded range (which would create a dead zone when panning
      // back).
      const next = {
        x: (scroller.scrollLeft - padX) / scale,
        y: (scroller.scrollTop - padY) / scale,
      };
      if (next.x !== origin.x || next.y !== origin.y) {
        syncingOrigin.current = true;
        lib.stateService.setOrigin(next);
        syncingOrigin.current = false;
      }
    },
    [lib, viewportRef],
  );

  const redraw = useCallback(() => {
    draw(lib?.stateService.getTransform());
  }, [draw, lib]);

  function handleViewportResize() {
    updateIdealScale();
    redraw();
  }

  function onImageLoad() {
    updateIdealScale();
    redraw();
  }

  useImperativeHandle(ref, () => ({
    draw,
    redraw,
    handleViewportResize,
    clearImage: () => {
      setImageSrc(null);
    },
    // The unscaled scale-1 frame, mirroring CanvasDraw — never a scaled
    // bounding rect, which would feed zoomed sizes to the engine.
    getImageRect: () => ({
      x: scrollerRef.current?.offsetLeft || 0,
      y: scrollerRef.current?.offsetTop || 0,
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
    <div className={styles.scroller} ref={scrollerRef}>
      {imageSrc && (
        <div className={styles.scrollStage} ref={canvasRef}>
          <img
            ref={imgRef}
            src={imageSrc}
            className={styles.scrollImage}
            draggable={false}
            onLoad={onImageLoad}
          />
        </div>
      )}
    </div>
  );
}

export default HtmlCanvas;
