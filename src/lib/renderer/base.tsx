import type { Rect, Transform } from 'canvas-drift';
import type { ViewportRef } from '../Viewport';
import { type Ref, type RefObject } from 'react';
import type { LibHook } from '../useGlideCanvas';

export type CanvasRef = {
  getImageRect: () => Rect;
  // clearImage?: () => void;
  handleViewportResize?: (viewport: ViewportRef) => void;
  // setFile: (file: File | null) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => void;
  fit: () => void;
  draw: (transform?: Transform) => void;
  redraw: () => void;
};

export type RendererConfig = {
  viewportRef?: RefObject<ViewportRef | null>;
  ref?: Ref<CanvasRef>;
  lib?: LibHook;
  image?: Blob | null;
  className?: string;
  style?: React.CSSProperties;
};



// export function BaseRenderer() {
//   const [blob, setBlob] = useState<Blob>();
// }
