import type { Discipline } from "./types.ts";

/** Strip Vietnamese diacritics + uppercase, so "Chiếu sáng" and "CHIEU SANG" match the same rule. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/\s+/g, " ");
}

// Order matters: non-electrical first (a water sheet may mention "điện" in notes).
const RULES: [Discipline, RegExp][] = [
  ["other", /CAP NUOC|THOAT NUOC|NUOC THAI|NUOC MUA|KET CAU|KIEN TRUC|PHONG CHAY|PCCC|BIA HO SO|DANH MUC BAN VE|CHI TIET LAP DAT|KICH THUOC|MAT BANG TRAN\b|MAT BANG SAN|MAT DUNG|MAT CAT|CAU THANG|BO TRI NOI THAT|PHOI CANH/],
  ["legend", /BANG KY HIEU|KY HIEU CHUNG|CHU THICH KY HIEU|LEGEND/],
  ["panel", /SO DO NGUYEN LY|SO DO TU|TU DIEN|SINGLE LINE|PANEL SCHEDULE/],
  ["lighting", /CHIEU SANG|LIGHTING|TRAN DEN|DIEN TRAN|BO TRI DEN/],
  ["low_voltage", /DIEN NHE|CAMERA|MANG LAN|DATA|INTERNET|TRUYEN HINH|LOW VOLTAGE/],
  ["hvac", /DIEU HOA|THONG GIO|HVAC|AIR CONDITION/],
  ["power", /CAP NGUON|CAP DIEN|O CAM|DONG LUC|POWER/],
];

// Tên bản vẽ dạng "<nội dung> TẦNG x" – tin cậy nhất; chú thích như "đèn trang trí cầu thang", "phối cảnh 3D" không làm sai
const TITLED: [Discipline, string][] = [
  ["other", "KICH THUOC BONG DEN|KICH THUOC|CAP NUOC|THOAT NUOC|KIEN TRUC|KET CAU|MAT BANG SAN|MAT BANG TRAN|MAT BANG MAI|NOI THAT"],
  ["lighting", "CAP DIEN TRAN DEN|DIEN TRAN DEN|TRAN DEN|CHIEU SANG|BO TRI DEN"],
  ["low_voltage", "DIEN NHE|CAMERA"],
  ["hvac", "DIEU HOA|THONG GIO"],
  ["power", "CAP DIEN|O CAM|CAP NGUON|DONG LUC"],
];
const FLOOR = "(TANG HAM|TANG MAI|TANG \\d+|TRET|LAU \\d+|MAI)\\b";
export function titledMatches(t: string): { discipline: Discipline; floor: string; at: number; end: number }[] {
  const out: { discipline: Discipline; floor: string; at: number; end: number }[] = [];
  for (const [d, alts] of TITLED) for (const m of t.matchAll(new RegExp(`(?:${alts}) ${FLOOR}`, "g")))
    { const at = m.index ?? 0, end = at + m[0].length; if (!out.some((o) => at < o.end && end > o.at)) out.push({ discipline: d, floor: floorOf(m[1]), at, end }); }
  return out.sort((a, b) => a.at - b.at);
}

/** Classify a sheet from its extractable PDF text (title block). Returns null when unsure → AI decides. */
export function classifyByText(text: string): { discipline: Discipline; floor: string } | null {
  const t = fold(text || "");
  if (t.trim().length < 8) return null;
  // prefer the title "MAT BANG ..." phrase when present
  const title = /MAT BANG [A-Z0-9 ]{3,60}|SO DO [A-Z0-9 ]{3,60}|BANG KY HIEU[A-Z0-9 ]{0,40}/.exec(t)?.[0] ?? t;
  const tm = titledMatches(t);
  if (tm.length >= 6 || new Set(tm.map((x) => x.discipline)).size >= 3) return { discipline: "other", floor: "Tầng 1" }; // trang danh mục bản vẽ
  if (tm.length) {
    // ưu tiên tên bản vẽ ngành điện nếu có (khung tên), rồi đến các tên khác
    const e = tm.find((x) => x.discipline !== "other") ?? tm[0];
    return { discipline: e.discipline, floor: e.floor };
  }
  for (const src of [title, t]) for (const [d, re] of RULES) if (re.test(src)) return { discipline: d, floor: floorOf(src === title && /TANG|LAU|TRET|MAI/.test(title) ? title : t) };
  return null;
}

export function floorOf(t: string): string {
  const f = fold(t);
  if (/TANG MAI|MAT BANG MAI/.test(f)) return "Mái";
  if (/TANG HAM|HAM XE|BASEMENT/.test(f)) return "Tầng hầm";
  const m = /TANG (\d+)|LAU (\d+)/.exec(f);
  if (m) return m[1] ? `Tầng ${m[1]}` : `Tầng ${Number(m[2]) + 1}`;
  if (/TRET|TANG 1\b/.test(f)) return "Tầng 1";
  return "Tầng 1";
}

/** Disciplines whose pages are read at all (everything else is skipped for speed). */
export const ELECTRICAL: Discipline[] = ["legend", "panel", "lighting", "power", "low_voltage", "hvac"];

/**
 * Bỏ chữ khung tên lặp lại trên hầu hết các trang (tên công ty thiết kế, "BVTC KIẾN TRÚC ĐIỆN NƯỚC", chủ đầu tư…)
 * để không làm mọi trang bị xếp nhầm là "kiến trúc". items[i] = các đoạn chữ của trang i.
 */
export function stripBoilerplate(items: string[][]): string[] {
  const n = items.length;
  if (n < 6) return items.map((a) => a.join(" "));
  const cnt = new Map<string, number>();
  for (const a of items) for (const k of new Set(a.map((x) => fold(x).trim()).filter((x) => x.length > 5))) cnt.set(k, (cnt.get(k) ?? 0) + 1);
  return items.map((a) => a.filter((x) => (cnt.get(fold(x).trim()) ?? 0) < n * 0.4).join(" "));
}

export interface TextBit { str: string; x: number; y: number; w: number; h: number }
/**
 * Ghép các mảnh chữ PDF bị cắt vụn ("C","Ấ","P","ĐI","Ệ","N TR"…) thành cụm chữ liền theo vị trí:
 * cùng dòng (y lệch < 0.3·cỡ chữ) và khoảng cách ngang nhỏ → nối liền, khoảng cách vừa → thêm dấu cách.
 */
export function mergeRuns(bits: TextBit[]): string[] {
  const out: string[] = [];
  let cur = "", last: TextBit | null = null;
  for (const b of bits) {
    if (!b.str) continue;
    const h = Math.max(1, Math.abs(b.h) || (last ? Math.abs(last.h) : 1));
    if (last && Math.abs(b.y - last.y) < h * 0.3) {
      const gap = b.x - (last.x + last.w);
      if (gap > -h * 0.5 && gap < h * 0.25) { cur += b.str; last = b; continue; }
      if (gap >= h * 0.25 && gap < h * 1.2) { cur += " " + b.str; last = b; continue; }
    }
    if (cur.trim()) out.push(cur.trim());
    cur = b.str; last = b;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
