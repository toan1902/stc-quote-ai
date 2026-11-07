"use client";
import type { Rect } from "../core/types";

type PdfJs = typeof import("pdfjs-dist");
let pdfjs: PdfJs | null = null;
async function lib(): Promise<PdfJs> {
  if (!pdfjs) {
    pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

export type PdfDoc = Awaited<ReturnType<PdfJs["getDocument"]>["promise"]>;

export async function loadPdf(file: File): Promise<PdfDoc> {
  const p = await lib();
  return p.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
}

/** Render a normalised region of a page so that its long side = outLong px (vector-sharp). */
export async function renderRegion(doc: PdfDoc, pageNo: number, region: Rect, outLong: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNo);
  const base = page.getViewport({ scale: 1 });
  const regW = region.w * base.width, regH = region.h * base.height;
  const scale = outLong / Math.max(regW, regH);
  const vp = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(regW * scale); canvas.height = Math.round(regH * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, transform: [1, 0, 0, 1, -region.x * vp.width, -region.y * vp.height] }).promise;
  return canvas;
}

export async function pageAspect(doc: PdfDoc, pageNo: number): Promise<number> {
  const vp = (await doc.getPage(pageNo)).getViewport({ scale: 1 });
  return vp.height / vp.width;
}

/** JPEG data URL, shrinking quality until under maxBytes (Vercel body limit). */
export function toJpeg(canvas: HTMLCanvasElement, maxBytes = 1_200_000): string {
  let q = 0.9, url = canvas.toDataURL("image/jpeg", q);
  while (url.length * 0.75 > maxBytes && q > 0.4) { q -= 0.1; url = canvas.toDataURL("image/jpeg", q); }
  return url;
}

/** Draw numbered red circles (verify pass). Points in canvas px. */
export function drawMarkers(src: HTMLCanvasElement, marks: { id: string; x: number; y: number }[]): HTMLCanvasElement {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
  const ctx = c.getContext("2d")!; ctx.drawImage(src, 0, 0);
  const r = Math.max(10, src.width / 110);
  ctx.lineWidth = Math.max(2, r / 5); ctx.font = `bold ${Math.round(r * 0.9)}px sans-serif`;
  for (const m of marks) {
    ctx.strokeStyle = "rgba(220,0,0,0.9)"; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "rgba(220,0,0,1)"; ctx.fillText(m.id, m.x + r + 2, m.y - r);
  }
  return c;
}
