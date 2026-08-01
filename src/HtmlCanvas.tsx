import { useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import styles from './Canvas.module.css';
import useLib from './useLib';
import useLocalStorage from './localStorageHook';
import type { CanvasHandle } from './Canvas';
import Viewport, { type ViewportRef } from './Viewport';
import type { Transform } from 'canvas-drift';

type HtmlCanvasProps = {
  ref?: Ref<CanvasHandle>;
  zoom?: { enabled?: boolean };
  pan?: { enabled?: boolean };
};

/**
 * Third implementation: no CSS transforms and no <canvas>.
 * Zoom resizes the <img> element itself (the browser re-rasterizes at the
 * layout size, so it stays sharp — unlike transformed layers on Safari) and
 * pan is a programmatic scroll of an overflow:hidden box (an element does not
 * need visible scrollbars to be scrollable via scrollTo).
 */
function HtmlCanvas({ ref }: HtmlCanvasProps) {
  const viewportRef = useRef<ViewportRef>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Layout size of the image at scale 1: the image fitted into the viewport
  // (same convention as the canvas tab's idealScale). Engine origins are
  // expressed in these units.
  const baseSize = useRef({ width: 0, height: 0 });
  const syncingOrigin = useRef(false);

  const [isMoving, setIsMoving] = useState(false);
  const [imageSrc, setImageSrc] = useLocalStorage<string | null>(
    'imageSrc',
    null,
  );

  function updateBaseSize() {
    const viewport = viewportRef.current;
    const img = imgRef.current;
    if (!viewport || !img?.naturalWidth || !img.naturalHeight) return;

    const fit = Math.min(
      viewport.getClientWidth() / img.naturalWidth,
      viewport.getClientHeight() / img.naturalHeight,
    );
    baseSize.current = {
      width: img.naturalWidth * fit,
      height: img.naturalHeight * fit,
    };
  }

  function applyTransform(transform: Transform) {
    const scroller = scrollerRef.current;
    const img = imgRef.current;
    const { width, height } = baseSize.current;
    if (!scroller || !img || !width) return;

    const { scale, origin } = transform;
    img.style.width = `${width * scale}px`;
    img.style.height = `${height * scale}px`;
    scroller.scrollTo(origin.x * scale, origin.y * scale);

    if (syncingOrigin.current) return;

    // The browser clamps the scroll position to the scrollable range. Feed the
    // clamped value back into the engine so its origin cannot drift past the
    // edges (which would create a dead zone when panning back). Axes where the
    // image fits inside the viewport keep the engine origin: scroll is pinned
    // to 0 there and margin:auto does the centering.
    const clampedX = scroller.scrollLeft / scale;
    const clampedY = scroller.scrollTop / scale;
    const next = { ...lib.stateService.getOrigin() };
    if (scroller.scrollWidth > scroller.clientWidth) next.x = clampedX;
    if (scroller.scrollHeight > scroller.clientHeight) next.y = clampedY;
    if (next.x !== origin.x || next.y !== origin.y) {
      syncingOrigin.current = true;
      lib.stateService.setOrigin(next);
      syncingOrigin.current = false;
    }
  }

  const lib = useLib({
    viewport: () => viewportRef.current?.getRect() || null,
    canvas: () => ({ x: 0, y: 0, ...baseSize.current }),
    zoomEnabled: true,
    panEnabled: true,
    onIsMovingChange(value) {
      setIsMoving(value);
    },
    onTransform(transform) {
      applyTransform(transform);
    },
  });

  function onImageLoad() {
    updateBaseSize();
    lib.fit();
  }

  function onViewportResize() {
    updateBaseSize();
    applyTransform(lib.stateService.getTransform());
  }

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
        onResize={onViewportResize}
        style={{ cursor: isMoving ? 'grabbing' : 'grab' }}>
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

export default HtmlCanvas;
