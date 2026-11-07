import type { CatalogItem, Settings } from "./types.ts";
import type { BOQResult } from "./boq.ts";
import { qtyOf } from "./boq.ts";
import { SECTIONS } from "./catalog.ts";
import { docSo } from "./words.ts";

export interface QuoteLine extends CatalogItem { qty: number; after: number; total: number; listTotal: number }
export interface QuoteSection { key: string; title: string; lines: QuoteLine[]; total: number; listTotal: number }
export interface Quote {
  sections: QuoteSection[];
  niem: number; giam: number; sau: number; lapDat: number; shTotal: number; shWords: string;
  lightLines: QuoteLine[]; lNiem: number; lCk: number; lInstall: number; lTotal: number;
  grandNiem: number; grandGiam: number; grandTotal: number; grandWords: string;
}

export function computeQuote(boq: BOQResult, catalog: CatalogItem[], s: Settings, overrides: Record<string, number> = {}): Quote {
  const cat = (code: string) => catalog.find((c) => c.code === code)!;
  const q = (code: string) => overrides[code] ?? qtyOf(boq, code);
  const mk = (code: string, qty: number): QuoteLine => {
    const c = cat(code); const after = Math.round(c.price * (1 - c.discount));
    return { ...c, qty, after, total: after * qty, listTotal: c.price * qty };
  };
  const shQty: Record<string, number> = {
    sw1: q("sw1"), sw2: q("sw2"), sw3: q("sw3"), sw4: q("sw4"), hub: q("hub"), zigbee: q("zigbee"), ir: q("ir"),
    gate_sw: overrides.gate_sw ?? 0,
    curtain_sw: q("curtain_sw"), curtain_motor: q("curtain_motor"), rail: q("rail"),
    cam_in: q("cam_in"), cam_out: q("cam_out"),
  };
  const sections: QuoteSection[] = [];
  for (const key of ["lighting_ctrl", "gate", "curtain", "camera"] as const) {
    const lines = catalog.filter((c) => c.section === key).map((c) => mk(c.code, shQty[c.code] ?? 0)).filter((l) => l.qty > 0);
    if (!lines.length) continue;
    sections.push({ key, title: SECTIONS[key], lines, total: lines.reduce((a, l) => a + l.total, 0), listTotal: lines.reduce((a, l) => a + l.listTotal, 0) });
  }
  // renumber section roman numerals in order of appearance
  const roman = ["I", "II", "III", "IV", "V"];
  sections.forEach((sec, i) => { sec.title = sec.title.replace(/^[IVX]+\./, roman[i] + "."); });

  const niem = sections.reduce((a, x) => a + x.listTotal, 0);
  const sau = sections.reduce((a, x) => a + x.total, 0);
  const giam = sau - niem;
  const lapDat = Math.round(niem * s.installRate);
  const shTotal = sau + lapDat;

  const lightQty: Record<string, number> = { athena: 0, spotlight_ab: 0, downlight_ab: 0, tube_ab: 0 };
  lightQty[s.defaultDownlight] += q("downlight");
  lightQty.spotlight_ab += q("spotlight");
  for (const k of Object.keys(lightQty)) if (overrides[`light_${k}`] != null) lightQty[k] = overrides[`light_${k}`];
  const lightLines = Object.entries(lightQty).filter(([, n]) => n > 0).map(([code, n]) => {
    const c = cat(code); return { ...c, qty: n, after: c.price, total: c.price * n, listTotal: c.price * n };
  });
  const lNiem = lightLines.reduce((a, l) => a + l.total, 0);
  const lCk = Math.round(lNiem * s.lightDiscount);
  const lInstall = Math.round(lNiem * s.lightInstall);
  const lTotal = lNiem - lCk + lInstall;

  const grandTotal = shTotal + lTotal;
  return {
    sections, niem, giam, sau, lapDat, shTotal, shWords: docSo(shTotal),
    lightLines, lNiem, lCk, lInstall, lTotal,
    grandNiem: niem + lNiem, grandGiam: giam - lCk, grandTotal, grandWords: docSo(grandTotal),
  };
}
