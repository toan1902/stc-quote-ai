import type { Detection, DeviceType, RoomLabel } from "./types.ts";
import { DEVICE_TYPES } from "./types.ts";
import { boxToPage, owns, pointToPage, type Tile } from "./tiling.ts";

export interface ModelItem {
  type: string; box_2d?: number[]; point?: number[]; circuits?: string | number[];
  room?: string; note?: string; twoWay?: boolean; confidence?: number;
}
export interface VerifyResult { remove?: string[]; retype?: { id: string; type: string }[]; add?: ModelItem[] }

let seq = 0;
export const newId = (p = "d") => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

export function normType(t: string): DeviceType | null {
  const k = String(t || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (DEVICE_TYPES as readonly string[]).includes(k) ? (k as DeviceType) : null;
}

/** Convert model items of one tile into page detections, keeping only those the tile owns. */
export function itemsToDetections(tile: Tile, page: number, items: ModelItem[], pass: 1 | 2): Detection[] {
  const out: Detection[] = [];
  for (const it of items || []) {
    const type = normType(it.type);
    if (!type) continue;
    let pos: { x: number; y: number; box?: [number, number, number, number] };
    if (Array.isArray(it.box_2d) && it.box_2d.length === 4) pos = boxToPage(tile.crop, it.box_2d);
    else if (Array.isArray(it.point) && it.point.length === 2) pos = pointToPage(tile.crop, it.point);
    else continue;
    if (!owns(tile, pos.x, pos.y)) continue; // ownership rule: no seam double counting
    out.push({
      id: newId(), page, type, x: pos.x, y: pos.y, box: pos.box,
      room: it.room?.trim() || undefined,
      circuits: Array.isArray(it.circuits) ? it.circuits.join(",") : it.circuits?.toString().trim() || undefined,
      twoWay: !!it.twoWay, note: it.note?.trim() || undefined,
      pass, status: pass === 2 ? "disputed" : "ok", confidence: it.confidence,
    });
  }
  return out;
}

export function roomsFromModel(tile: Tile, page: number, rooms: { name: string; point: number[] }[] = []): RoomLabel[] {
  return rooms.filter((r) => r?.name && Array.isArray(r.point)).map((r) => ({ page, name: r.name.trim(), ...pointToPage(tile.crop, r.point) }))
    .filter((r) => r.x >= tile.core.x && r.x <= tile.core.x + tile.core.w && r.y >= tile.core.y && r.y <= tile.core.y + tile.core.h);
}

/** Apply a verification pass: removed → status removed; retyped/added → disputed. */
export function applyVerify(dets: Detection[], tile: Tile, page: number, v: VerifyResult): Detection[] {
  const rm = new Set(v.remove || []);
  const rt = new Map((v.retype || []).map((r) => [r.id, normType(r.type)]));
  const res = dets.map((d) => {
    if (rm.has(d.id)) return { ...d, status: "removed" as const, pass: 2 as const };
    const t = rt.get(d.id);
    if (t && t !== d.type) return { ...d, type: t, status: "disputed" as const, note: `${d.note ?? ""} (AI soát lại: đổi loại)`.trim() };
    return d;
  });
  return res.concat(itemsToDetections(tile, page, v.add || [], 2));
}

/** Remove jitter duplicates: same page & type, centres closer than eps (fraction of page width). */
export function dedupe(dets: Detection[], eps = 0.004): { kept: Detection[]; dropped: Detection[] } {
  const kept: Detection[] = [], dropped: Detection[] = [];
  for (const d of dets) {
    if (d.status === "removed") { kept.push(d); continue; }
    const dup = kept.find((k) => k.status !== "removed" && k.page === d.page && k.type === d.type && Math.hypot(k.x - d.x, k.y - d.y) < eps);
    if (dup) dropped.push(d); else kept.push(d);
  }
  return { kept, dropped };
}

export const active = (dets: Detection[]) => dets.filter((d) => d.status !== "removed");
