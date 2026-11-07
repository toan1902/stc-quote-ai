import type { Detection, RoomLabel } from "./types.ts";

export function normRoom(s?: string): string | undefined {
  if (!s) return undefined;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.replace(/^p\.?\s*/i, (m) => (/^p\.?\s*$/i.test(m) ? "P." : m)).replace(/^P\.\s+/, "P.");
}

/** Fill missing rooms with the nearest room label on the same page (research R5). */
export function assignRooms(dets: Detection[], labels: RoomLabel[]): Detection[] {
  return dets.map((d) => {
    if (d.room) return { ...d, room: normRoom(d.room) };
    const cands = labels.filter((l) => l.page === d.page);
    if (!cands.length || !(d.x >= 0)) return d;
    let best = cands[0], bd = Infinity;
    for (const l of cands) { const dd = Math.hypot(l.x - d.x, l.y - d.y); if (dd < bd) { bd = dd; best = l; } }
    return { ...d, room: normRoom(best.name) };
  });
}
