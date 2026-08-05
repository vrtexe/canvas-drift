import type { Rect, Transform } from "canvas-glide";
import type { ViewportRef } from "../Viewport";
import { type HTMLProps, type Ref, type RefObject } from "react";
import type { GlideCanvasInstance } from "../useGlideCanvas";

export type CanvasRef<T, C> = {
  getContainerRef?: () => C | null;
  getContentRef?: () => T | null;
  getImageRect?: () => Rect;
  handleViewportResize?: (viewport: ViewportRef) => void;
  draw?: (transform?: Transform) => void;
};

export type RendererComponentProps<T> = HTMLProps<T> & {
  className?: string;
  style?: React.CSSProperties;
};

export type RendererProps<R extends Renderer, T = unknown, C = unknown> = {
  content?: RendererComponentProps<T>;
  container?: RendererComponentProps<C>;
  afterDraw?: (transform?: Transform, data?: RendererRef[R]) => void;
};

export type RendererPropsMap = {
  [Renderer.Canvas]: RendererProps<typeof Renderer.Canvas, HTMLCanvasElement, HTMLCanvasElement>;
  [Renderer.Image]: RendererProps<typeof Renderer.Image, HTMLImageElement, HTMLDivElement>;
  [Renderer.Html]: RendererProps<typeof Renderer.Html, HTMLImageElement, HTMLDivElement>;
  [Renderer.Custom]: RendererProps<typeof Renderer.Custom, HTMLElement, HTMLElement>;
};

export type BaseRenderConfig<R> = {
  viewportRef?: RefObject<ViewportRef | null>;
  image?: Blob | null;
  lib?: GlideCanvasInstance;
  ref?: Ref<R>;
};
export type RendererConfig<T extends Renderer> = RendererPropsMap[T] & BaseRenderConfig<RendererRef[T]>;

export type RendererRef = {
  [Renderer.Canvas]: CanvasRef<HTMLCanvasElement, HTMLCanvasElement>;
  [Renderer.Image]: CanvasRef<HTMLImageElement, HTMLDivElement>;
  [Renderer.Html]: CanvasRef<HTMLImageElement, HTMLDivElement>;
  [Renderer.Custom]: never;
};

export type Renderer = (typeof Renderer)[keyof typeof Renderer];
export const Renderer = Object.freeze({
  Canvas: "canvas",
  Image: "image",
  Html: "html",
  Custom: "custom",
} as const);

export type CanvasOptions<T extends Renderer> = RendererPropsMap[T];
