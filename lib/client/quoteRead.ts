"use client";
// Đọc BÁO GIÁ CÓ SẴN (PDF – kể cả bản scan/in ảnh – hoặc Excel) bằng AI → QuoteRead[] để dựng lại theo mẫu STC.
import { ai, type Log } from "./pipeline";
import { loadPdf, renderRegion, toJpeg } from "./pdf";
import type { QuoteRead } from "../core/quoteImport";

async function excelText(f: File): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await f.arrayBuffer());
  const out: string[] = [];
  wb.eachSheet((ws) => {
    out.push(`### Sheet: ${ws.name}`);
    ws.eachRow((row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => {
        if (v == null) return "";
        if (typeof v === "object") { const o = v as { result?: unknown; text?: string; richText?: { text: string }[] }; return String(o.result ?? o.text ?? o.richText?.map((r) => r.text).join("") ?? ""); }
        return String(v);
      });
      if (cells.some((c) => c.trim())) out.push(cells.join(" | ").replace(/\s+/g, " "));
    });
  });
  return out.join("\n");
}

export async function readQuoteFiles(files: File[], log: Log, signal?: AbortSignal): Promise<QuoteRead[]> {
  const reads: QuoteRead[] = [];
  for (const f of files) {
    if (/\.xlsx$/i.test(f.name)) {
      log(`Đọc Excel ${f.name}…`);
      reads.push(await ai<QuoteRead>("quote_read", "", { text: await excelText(f) }, log, signal));
    } else if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
      const doc = await loadPdf(f);
      for (let p = 1; p <= doc.numPages; p++) {
        log(`Đọc ${f.name} – trang ${p}/${doc.numPages}…`, p / doc.numPages);
        const img = toJpeg(await renderRegion(doc, p, { x: 0, y: 0, w: 1, h: 1 }, 2000), 1_500_000);
        const r = await ai<QuoteRead>("quote_read", img, { page: p }, log, signal);
        reads.push({ ...r, items: Array.isArray(r?.items) ? r.items : [] });
      }
    } else throw new Error(`${f.name}: chỉ nhận PDF hoặc Excel (.xlsx)`);
  }
  return reads;
}
