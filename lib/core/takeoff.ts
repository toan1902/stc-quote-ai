import type { Detection, Project } from "./types.ts";
import { normType, newId } from "./merge.ts";

export interface TakeoffJSON {
  version: 1;
  project: { customer: string; address?: string; date?: string; sourceName?: string };
  pages?: { index: number; discipline: string; floor?: string; title?: string }[];
  detections: (Partial<Detection> & { type: string; qty?: number })[];
  estimates?: { key: string; meters: number }[];
  acUnits?: number;
  panelAcCircuits?: number;
}

export function validateTakeoff(j: unknown): string[] {
  const e: string[] = [];
  const t = j as TakeoffJSON;
  if (!t || typeof t !== "object") return ["File không phải JSON hợp lệ"];
  if (t.version !== 1) e.push("version phải = 1");
  if (!t.project?.customer) e.push("thiếu project.customer");
  if (!Array.isArray(t.detections)) e.push("thiếu detections[]");
  else t.detections.forEach((d, i) => { if (!normType(d.type)) e.push(`detections[${i}].type không hợp lệ: ${d.type}`); });
  return e;
}

/** Build a Project from takeoff JSON; position-less items with qty are expanded (x=y=-1). */
export function importTakeoff(t: TakeoffJSON, today: string): Project {
  const dets: Detection[] = [];
  for (const d of t.detections) {
    const type = normType(d.type)!;
    const n = Math.max(1, d.qty ?? 1);
    for (let i = 0; i < n; i++) dets.push({
      id: d.id && n === 1 ? d.id : newId("i"), page: d.page ?? 0, type,
      x: d.x ?? -1, y: d.y ?? -1, room: d.room, circuits: d.circuits, twoWay: d.twoWay, note: d.note,
      floor: d.floor, pass: "import", status: "ok",
    });
  }
  return {
    id: newId("p"), customer: t.project.customer, address: t.project.address || "Đắk Lắk", date: t.project.date || today,
    sourceName: t.project.sourceName || "takeoff.json", status: "draft", source: "claude-import",
    pages: (t.pages || []).map((p) => ({ index: p.index, discipline: p.discipline as Project["pages"][number]["discipline"], floor: p.floor || "Tầng 1", title: p.title, confidence: 1, analysed: true })),
    legend: [], detections: dets, rooms: [], estimates: (t.estimates || []).map((e) => ({ ...e, source: "import" as const })),
    acUnits: t.acUnits, panelAcCircuits: t.panelAcCircuits, edits: [],
  };
}

export function exportTakeoff(p: Project): TakeoffJSON {
  return {
    version: 1,
    project: { customer: p.customer, address: p.address, date: p.date, sourceName: p.sourceName },
    pages: p.pages.map((x) => ({ index: x.index, discipline: x.discipline, floor: x.floor, title: x.title })),
    detections: p.detections.filter((d) => d.status !== "removed").map(({ id, page, type, x, y, room, circuits, twoWay, note, floor }) => ({ id, page, type, x, y, room, circuits, twoWay, note, floor })),
    estimates: p.estimates.map(({ key, meters }) => ({ key, meters })),
    acUnits: p.acUnits, panelAcCircuits: p.panelAcCircuits,
  };
}
