"use client";
import type { Detection, Discipline, LegendSymbol, Page, Project, Rect, RoomLabel } from "../core/types";
import { planTiles, pageToCrop } from "../core/tiling";
import { itemsToDetections, roomsFromModel, applyVerify, dedupe, type ModelItem, type VerifyResult } from "../core/merge";
import { assignRooms } from "../core/rooms";
import { drawMarkers, pageAspect, renderRegion, toJpeg, type PdfDoc } from "./pdf";

export type Log = (msg: string, frac?: number) => void;
const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Call /api/ai with back-off on rate limits (FR-020). */
export async function ai<T>(task: string, image: string, context: Record<string, unknown>, log: Log, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; attempt < 8; attempt++) {
    if (signal?.aborted) throw new Error("Đã dừng");
    const r = await fetch("/api/ai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task, image, context }), signal });
    if (r.status === 429) {
      const { retryAfter = 30 } = await r.json().catch(() => ({}));
      const wait = Math.min(90, retryAfter * (1 + attempt * 0.5));
      log(`Hạn mức AI miễn phí tạm hết – chờ ${Math.round(wait)} giây rồi thử lại…`);
      await sleep(wait * 1000); continue;
    }
    if (r.status === 401) throw new Error("Phiên đăng nhập hết hạn – đăng nhập lại");
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j.data as T;
    if (attempt >= 2) throw new Error(j.detail || `Lỗi AI (${r.status})`);
    await sleep(3000);
  }
  throw new Error("AI quá tải, thử lại sau");
}

/** Phase A: classify pages, read legend & panel schedule. */
export async function analyseStructure(doc: PdfDoc, project: Project, log: Log, signal?: AbortSignal): Promise<Project> {
  const n = doc.numPages;
  const pages: Page[] = [];
  for (let i = 1; i <= n; i++) {
    log(`Phân loại trang ${i}/${n}`, (i - 1) / n * 0.6);
    const img = toJpeg(await renderRegion(doc, i, FULL, 1400));
    const c = await ai<{ discipline: Discipline; floor: string; title?: string; confidence: number }>("classify", img, {}, log, signal);
    pages.push({ index: i, discipline: c.discipline || "other", floor: c.floor || "Tầng 1", title: c.title, confidence: c.confidence ?? 0.5, analysed: false });
  }
  let legend: LegendSymbol[] = [];
  for (const p of pages.filter((x) => x.discipline === "legend")) {
    log(`Đọc bảng ký hiệu (trang ${p.index})`, 0.7);
    const r = await ai<{ symbols: LegendSymbol[] }>("legend", toJpeg(await renderRegion(doc, p.index, FULL, 2000)), {}, log, signal);
    legend = legend.concat(r.symbols || []);
  }
  let panelAcCircuits: number | undefined;
  for (const p of pages.filter((x) => x.discipline === "panel")) {
    log(`Đọc sơ đồ tủ điện (trang ${p.index})`, 0.85);
    const r = await ai<{ ac_circuits?: number }>("panel", toJpeg(await renderRegion(doc, p.index, FULL, 2000)), {}, log, signal);
    if (typeof r.ac_circuits === "number") panelAcCircuits = (panelAcCircuits ?? 0) + r.ac_circuits;
  }
  log("Xong bước nhận diện trang", 1);
  return { ...project, pages, legend, panelAcCircuits };
}

export const COUNT_DISCIPLINES: Discipline[] = ["lighting", "power", "low_voltage", "hvac"];

/** Phase B: frame → ownership tiles → detect → verify → merge (research R2–R5). */
export async function countDevices(doc: PdfDoc, project: Project, log: Log, signal?: AbortSignal, onPartial?: (p: Project) => void): Promise<Project> {
  // resume: keep results of pages already analysed (FR-020) + manual points
  const done = new Set(project.pages.filter((p) => p.analysed).map((p) => p.index));
  let detections: Detection[] = project.detections.filter((d) => d.pass === "manual" || done.has(d.page));
  let rooms: RoomLabel[] = project.rooms.filter((r) => done.has(r.page));
  const estimates = [...project.estimates.filter((e) => e.source === "manual" || done.size > 0)];
  const pages = project.pages.map((p) => ({ ...p }));
  const todo = pages.filter((p) => COUNT_DISCIPLINES.includes(p.discipline) && !p.analysed);
  const legend = project.legend.filter((l) => l.deviceType !== "ignore");
  let k = 0;
  for (const pg of todo) {
    k++;
    const base = (k - 1) / todo.length;
    log(`Trang ${pg.index} (${pg.discipline}): xác định khung bản vẽ`, base);
    const fr = await ai<{ box_2d?: number[] }>("frame", toJpeg(await renderRegion(doc, pg.index, FULL, 1400)), {}, log, signal);
    let frame: Rect = { x: 0.03, y: 0.03, w: 0.75, h: 0.92 };
    if (Array.isArray(fr.box_2d) && fr.box_2d.length === 4) {
      const [y1, x1, y2, x2] = fr.box_2d.map((v) => v / 1000);
      if (x2 - x1 > 0.2 && y2 - y1 > 0.2) frame = { x: Math.max(0, x1 - 0.01), y: Math.max(0, y1 - 0.01), w: Math.min(1, x2 - x1 + 0.02), h: Math.min(1, y2 - y1 + 0.02) };
    }
    pg.frame = frame;
    const tiles = planTiles(frame, await pageAspect(doc, pg.index));
    let pageDets: Detection[] = [];
    for (let t = 0; t < tiles.length; t++) {
      const tile = tiles[t];
      const frac = base + ((t + 0.5) / tiles.length) / todo.length;
      log(`Trang ${pg.index}: đếm ô ${t + 1}/${tiles.length} (lượt 1)`, frac);
      const canvas = await renderRegion(doc, pg.index, tile.crop, 1536);
      const ctx = { legend, discipline: pg.discipline };
      const det = await ai<{ items?: ModelItem[]; rooms?: { name: string; point: number[] }[] }>("detect", toJpeg(canvas), ctx, log, signal);
      let tileDets = itemsToDetections(tile, pg.index, det.items || [], 1);
      rooms = rooms.concat(roomsFromModel(tile, pg.index, det.rooms));
      // verification pass on an annotated image
      log(`Trang ${pg.index}: soát lại ô ${t + 1}/${tiles.length} (lượt 2)`, frac);
      const short = tileDets.map((d, i) => ({ ...d, sid: String(i + 1) }));
      const marks = short.map((d) => { const c = pageToCrop(tile.crop, d.x, d.y); return { id: d.sid, x: (c.x / 1000) * canvas.width, y: (c.y / 1000) * canvas.height }; });
      const vr = await ai<VerifyResult>("verify", toJpeg(drawMarkers(canvas, marks)), { ...ctx, candidates: short.map((d) => ({ id: d.sid, type: d.type, circuits: d.circuits })) }, log, signal);
      const map = new Map(short.map((d) => [d.sid, d.id]));
      tileDets = applyVerify(tileDets, tile, pg.index, {
        remove: (vr.remove || []).map((s) => map.get(String(s))!).filter(Boolean),
        retype: (vr.retype || []).map((r) => ({ id: map.get(String(r.id))!, type: r.type })).filter((r) => r.id),
        add: vr.add || [],
      });
      pageDets = pageDets.concat(tileDets.map((d) => ({ ...d, floor: pg.floor })));
      onPartial?.({ ...project, pages: pages.map((x) => ({ ...x })), detections: detections.concat(pageDets), rooms, estimates });
    }
    if (pg.discipline === "lighting") {
      log(`Trang ${pg.index}: ước tính LED dây / ray rèm`, base + 0.95 / todo.length);
      const est = await ai<{ led_strip?: { room: string; meters: number }[]; rails?: { room: string; meters: number }[] }>("estimate", toJpeg(await renderRegion(doc, pg.index, frame, 2000)), {}, log, signal);
      for (const e of est.led_strip || []) if (e.meters > 0 && !estimates.some((x) => x.key === `led_strip:${e.room}`)) estimates.push({ key: `led_strip:${e.room}`, meters: e.meters, source: "ai" });
      for (const e of est.rails || []) if (e.meters > 0 && !estimates.some((x) => x.key === `rail:${e.room}`)) estimates.push({ key: `rail:${e.room}`, meters: e.meters, source: "ai" });
    }
    pg.analysed = true;
    detections = detections.concat(dedupe(pageDets).kept);
    onPartial?.({ ...project, pages: pages.map((x) => ({ ...x })), detections, rooms, estimates });
  }
  detections = assignRooms(detections, rooms);
  log("Hoàn tất đếm thiết bị", 1);
  return { ...project, pages, detections, rooms, estimates };
}
