import type { Rect } from "./types.ts";

export interface Tile {
  id: string; row: number; col: number;
  core: Rect;   // ownership region (partition of the frame)
  crop: Rect;   // region actually sent to the model (core + overlap, clipped)
  lastRow: boolean; lastCol: boolean;
}

export interface TileOptions {
  tilePx?: number;       // long side of the image sent to the model
  minSymbolPx?: number;  // smallest symbol must be at least this many px in the sent image
  symbolFrac?: number;   // typical smallest symbol size as fraction of page width
  overlap?: number;      // context overlap as fraction of core size on each side
  minGrid?: number;      // at least NxN tiles for drawing pages
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Plan an ownership-tiling of the drawing frame (research R3). */
export function planTiles(frame: Rect, pageAspect: number, o: TileOptions = {}): Tile[] {
  const tilePx = o.tilePx ?? 1536, minPx = o.minSymbolPx ?? 24, sym = o.symbolFrac ?? 0.005;
  const overlap = o.overlap ?? 0.12, minGrid = o.minGrid ?? 2;
  // max crop width (page-width fraction) so that a symbol of `sym` stays >= minPx at tilePx
  const maxW = (sym * tilePx) / minPx / (1 + 2 * overlap);
  // pageAspect = height/width; keep tiles roughly square in absolute units
  const maxH = maxW / pageAspect;
  const cols = Math.max(minGrid, Math.ceil(frame.w / maxW));
  const rows = Math.max(minGrid, Math.ceil(frame.h / maxH));
  const cw = frame.w / cols, ch = frame.h / rows;
  const tiles: Tile[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const core = { x: frame.x + c * cw, y: frame.y + r * ch, w: cw, h: ch };
    const x1 = clamp01(core.x - cw * overlap), y1 = clamp01(core.y - ch * overlap);
    const x2 = clamp01(core.x + cw * (1 + overlap)), y2 = clamp01(core.y + ch * (1 + overlap));
    tiles.push({ id: `r${r}c${c}`, row: r, col: c, core, crop: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 },
      lastRow: r === rows - 1, lastCol: c === cols - 1 });
  }
  return tiles;
}

/** box_2d [ymin,xmin,ymax,xmax] (0..1000 of the crop image) → page-normalised box + centre. */
export function boxToPage(crop: Rect, box2d: number[]) {
  const [ymin, xmin, ymax, xmax] = box2d.map((v) => Math.max(0, Math.min(1000, Number(v) || 0)));
  const x1 = crop.x + (Math.min(xmin, xmax) / 1000) * crop.w;
  const x2 = crop.x + (Math.max(xmin, xmax) / 1000) * crop.w;
  const y1 = crop.y + (Math.min(ymin, ymax) / 1000) * crop.h;
  const y2 = crop.y + (Math.max(ymin, ymax) / 1000) * crop.h;
  return { box: [x1, y1, x2, y2] as [number, number, number, number], x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

/** point [y,x] 0..1000 of crop → page coords */
export function pointToPage(crop: Rect, pt: number[]) {
  const [y, x] = pt;
  return { x: crop.x + (x / 1000) * crop.w, y: crop.y + (y / 1000) * crop.h };
}

/** page coords → 0..1000 of crop (for drawing verify markers) */
export function pageToCrop(crop: Rect, x: number, y: number) {
  return { x: ((x - crop.x) / crop.w) * 1000, y: ((y - crop.y) / crop.h) * 1000 };
}

/** Ownership: half-open core, closed on the last row/column so the frame edge is owned. */
export function owns(t: Tile, x: number, y: number): boolean {
  const inX = x >= t.core.x && (t.lastCol ? x <= t.core.x + t.core.w + 1e-9 : x < t.core.x + t.core.w);
  const inY = y >= t.core.y && (t.lastRow ? y <= t.core.y + t.core.h + 1e-9 : y < t.core.y + t.core.h);
  return inX && inY;
}
