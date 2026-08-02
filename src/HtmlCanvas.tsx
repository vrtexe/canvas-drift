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
 * need visible scrollbars to be scrollable via scrollTo).
 */
function HtmlCanvas({ viewportRef, ref, lib }: HtmlCanvasProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
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
      const img = imgRef.current;
      if (!transform || !scroller || !img?.naturalWidth) return;

      const { scale, origin } = transform;
      img.style.width = `${img.naturalWidth * idealScale.current * scale}px`;
      img.style.height = `${img.naturalHeight * idealScale.current * scale}px`;
      scroller.scrollTo(origin.x * scale, origin.y * scale);

      if (syncingOrigin.current || !lib) return;

      // The browser clamps the scroll position to the scrollable range. Feed
      // the clamped value back into the engine so its origin cannot drift past
      // the edges (which would create a dead zone when panning back). Axes
      // where the image fits inside the viewport keep the engine origin:
      // scroll is pinned to 0 there and margin:auto does the centering.
      const next = { ...lib.stateService.getOrigin() };
      if (scroller.scrollWidth > scroller.clientWidth)
        next.x = scroller.scrollLeft / scale;
      if (scroller.scrollHeight > scroller.clientHeight)
        next.y = scroller.scrollTop / scale;
      if (next.x !== origin.x || next.y !== origin.y) {
        syncingOrigin.current = true;
        lib.stateService.setOrigin(next);
        syncingOrigin.current = false;
      }
    },
    [lib],
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
    lib?.fit();
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
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Office floor plan"
          className={styles.scrollImage}
          draggable={false}
          onLoad={onImageLoad}
        />
      )}
    </div>
  );
}

export default HtmlCanvas;
