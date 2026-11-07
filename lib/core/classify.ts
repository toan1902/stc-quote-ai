import type { Discipline } from "./types.ts";

/** Strip Vietnamese diacritics + uppercase, so "Chiếu sáng" and "CHIEU SANG" match the same rule. */
export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/\s+/g, " ");
}

// Order matters: non-electrical first (a water sheet may mention "điện" in notes).
const RULES: [Discipline, RegExp][] = [
  ["other", /CAP NUOC|THOAT NUOC|NUOC THAI|NUOC MUA|KET CAU|KIEN TRUC|PHONG CHAY|PCCC|BIA HO SO|DANH MUC BAN VE|CHI TIET LAP DAT/],
  ["legend", /BANG KY HIEU|KY HIEU CHUNG|CHU THICH KY HIEU|LEGEND/],
  ["panel", /SO DO NGUYEN LY|SO DO TU|TU DIEN|SINGLE LINE|PANEL SCHEDULE/],
  ["lighting", /CHIEU SANG|LIGHTING/],
  ["low_voltage", /DIEN NHE|CAMERA|MANG LAN|DATA|INTERNET|TRUYEN HINH|LOW VOLTAGE/],
  ["hvac", /DIEU HOA|THONG GIO|HVAC|AIR CONDITION/],
  ["power", /CAP NGUON|O CAM|DONG LUC|POWER/],
];

/** Classify a sheet from its extractable PDF text (title block). Returns null when unsure → AI decides. */
export function classifyByText(text: string): { discipline: Discipline; floor: string } | null {
  const t = fold(text || "");
  if (t.trim().length < 8) return null;
  // prefer the title "MAT BANG ..." phrase when present
  const title = /MAT BANG [A-Z0-9 ]{3,60}|SO DO [A-Z0-9 ]{3,60}|BANG KY HIEU[A-Z0-9 ]{0,40}/.exec(t)?.[0] ?? t;
  for (const src of [title, t]) for (const [d, re] of RULES) if (re.test(src)) return { discipline: d, floor: floorOf(t) };
  return null;
}

export function floorOf(t: string): string {
  const f = fold(t);
  if (/TANG MAI|MAT BANG MAI/.test(f)) return "Mái";
  const m = /TANG (\d+)|LAU (\d+)/.exec(f);
  if (m) return m[1] ? `Tầng ${m[1]}` : `Tầng ${Number(m[2]) + 1}`;
  if (/TRET|TANG 1\b/.test(f)) return "Tầng 1";
  return "Tầng 1";
}

/** Disciplines whose pages are read at all (everything else is skipped for speed). */
export const ELECTRICAL: Discipline[] = ["legend", "panel", "lighting", "power", "low_voltage", "hvac"];
