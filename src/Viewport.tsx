import { useEffect, useImperativeHandle, useRef, type HTMLProps, type PropsWithChildren, type Ref } from "react";
import type { GlideCanvasInstance } from "./useGlideCanvas";
import { attachEvent, attachWheelEvent } from "./util/event";

export type ViewportRef = {
  getElement: () => HTMLDivElement | null;
  getClientWidth: () => number;
  getClientHeight: () => number;
  getRect: () => DOMRect | null;
  getWidth: () => number;
  getHeight: () => number;
};

export type ViewportOptions = Omit<HTMLProps<HTMLDivElement>, "ref"> & {
  onResize?: (ref: ViewportRef) => void;

  pointerDownEnabled?: boolean;
  pointerMoveEnabled?: boolean;
  pointerUpEnabled?: boolean;
  pointerCancelEnabled?: boolean;
  wheelEnabled?: boolean;
};

export type ViewportProps = ViewportOptions & {
  ref?: Ref<ViewportRef>;
  lib?: GlideCanvasInstance;
};

const defaultStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  background: "transparent",
  overflow: "hidden",
  userSelect: "none",
  touchAction: "none",
  overscrollBehavior: "contain",
};

export function Viewport({
  ref,
  lib,
  children,
  style,
  className,
  onResize,

  pointerDownEnabled = true,
  pointerMoveEnabled = true,
  pointerUpEnabled = true,
  pointerCancelEnabled = true,
  wheelEnabled = true,

  ...rest
}: PropsWithChildren<ViewportProps>) {
  const elementRef = useRef<HTMLDivElement>(null);
  const rect = useRef(elementRef?.current?.getBoundingClientRect());
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  const combineStyles: React.CSSProperties = {
    ...defaultStyle,
    ...style,
  };

  function getViewportWidth() {
    if (!elementRef?.current) return 0;
    return elementRef.current.clientWidth * (window.devicePixelRatio || 1);
  }

  function getViewportHeight() {
    if (!elementRef?.current) return 0;
    return elementRef.current.clientHeight * (window.devicePixelRatio || 1);
  }

  useEffect(() => {
    if (lib?.onWheel === undefined || wheelEnabled === false) return;
    return attachWheelEvent(elementRef.current, lib.onWheel, { passive: false });
  }, [lib?.onWheel]);

  useEffect(() => {
    if (!elementRef.current) return;

    function updateCanvasSize() {
      updateRect();
      onResizeRef.current?.(dataRef.current);
    }

    const ro = new ResizeObserver(updateCanvasSize);
    ro.observe(elementRef.current);

    return () => ro.disconnect();
  }, []);

  function updateRect() {
    rect.current = elementRef.current?.getBoundingClientRect();
  }

  useEffect(() => attachEvent("scroll", window, updateRect, { capture: true, passive: true }), []);

  const dataRef = useRef<ViewportRef>({
    getElement: () => elementRef.current,
    getClientWidth: () => elementRef.current?.clientWidth || 0,
    getClientHeight: () => elementRef.current?.clientHeight || 0,
    getWidth: getViewportWidth,
    getHeight: getViewportHeight,
    getRect: () => rect.current || null,
  });

  useImperativeHandle(ref, () => dataRef.current);

  return (
    <div
      ref={elementRef}
      className={className}
      style={combineStyles}
      onPointerDown={pointerDownEnabled ? lib?.onPointerDown : undefined}
      onPointerMove={pointerMoveEnabled ? lib?.onPointerMove : undefined}
      onPointerUp={pointerUpEnabled ? lib?.onPointerUp : undefined}
      onPointerCancel={pointerCancelEnabled ? lib?.onPointerUp : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
