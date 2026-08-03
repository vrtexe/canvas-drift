import { type Point, type PointConstrainer, type Rect } from 'canvas-drift';
export declare const CONSTRAINT_THRESHOLD = 0;
export type OriginConstrainerConfig = {
    getViewportRect: () => Rect | null;
    getCanvasRect: () => Rect | null;
    getScale: () => number;
};
export declare function createConstrainer(config: OriginConstrainerConfig): PointConstrainer;
export declare function constrainOrigin(origin: Point, scale: number, viewport: Rect, canvas: Rect): Point;
