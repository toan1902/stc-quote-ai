"use client";
import type { Project, Rect } from "../core/types";
import type { BOQResult } from "../core/boq";
import { renderRegion, type PdfDoc } from "./pdf";

export interface ProposalDrawing { page: number; floor: string; img: string; byRoom: { room: string; qty: number }[] }

/** Crop the lighting plan around the proposed spotlights and draw them as orange numbered rings (client-side only). */
export async function buildProposalDrawings(doc: PdfDoc, project: Project, boq: BOQResult): Promise<ProposalDrawing[]> {
  const out: ProposalDrawing[] = [];
  for (const pr of boq.proposals) {
    const pts = project.detections.filter((d) => pr.ids.includes(d.id) && d.x >= 0);
    if (!pts.length) continue;
    const pad = 0.06;
    let x1 = Math.min(...pts.map((p) => p.x)) - pad, x2 = Math.max(...pts.map((p) => p.x)) + pad;
    let y1 = Math.min(...pts.map((p) => p.y)) - pad, y2 = Math.max(...pts.map((p) => p.y)) + pad;
    const grow = (a: number, b: number, min: number): [number, number] => { const c = (a + b) / 2, h = Math.max(b - a, min) / 2; return [Math.max(0, c - h), Math.min(1, c + h)]; };
    [x1, x2] = grow(x1, x2, 0.2); [y1, y2] = grow(y1, y2, 0.2);
    const region: Rect = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    const c = await renderRegion(doc, pr.page, region, 2400);
    const ctx = c.getContext("2d")!;
    const r = Math.max(14, c.width / 90);
    pts.forEach((p, i) => {
      const cx = ((p.x - region.x) / region.w) * c.width, cy = ((p.y - region.y) / region.h) * c.height;
      ctx.lineWidth = r / 3.2; ctx.strokeStyle = "#ea580c"; ctx.fillStyle = "rgba(234,88,12,.18)";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.arc(cx, cy, r / 3, 0, Math.PI * 2); ctx.fill();
      ctx.font = `bold ${Math.round(r * 1.05)}px sans-serif`; ctx.fillStyle = "#c2410c"; ctx.fillText(`S${i + 1}`, cx + r + 3, cy - r * 0.6);
    });
    out.push({ page: pr.page, floor: pr.floor, img: c.toDataURL("image/jpeg", 0.85), byRoom: pr.byRoom });
  }
  return out;
}
