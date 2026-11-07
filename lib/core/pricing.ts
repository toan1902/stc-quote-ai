import type { CatalogItem, Settings } from "./types.ts";
import type { BOQResult } from "./boq.ts";
import { qtyOf } from "./boq.ts";
import { SECTIONS } from "./catalog.ts";
import { docSo } from "./words.ts";

export interface QuoteLine extends CatalogItem { qty: number; after: number; total: number; listTotal: number; proposed?: boolean }
export interface QuoteSection { key: string; title: string; lines: QuoteLine[]; total: number; listTotal: number }
export interface Quote {
  sections: QuoteSection[];
  niem: number; giam: number; sau: number; lapDat: number; kmLapDat: number; freeList: number; shTotal: number; shWords: string;
  lightLines: QuoteLine[]; lNiem: number; lCk: number; lInstall: number; lTotal: number;
  /** nâng cấp toàn bộ đèn thường AB → đèn thông minh FPT: số bộ và chi phí thêm (sau chiết khấu) */
  upgrade: { qty: number; extra: number };
  grandNiem: number; grandGiam: number; grandTotal: number; grandWords: string;
}

export function computeQuote(boq: BOQResult, catalog: CatalogItem[], s: Settings, overrides: Record<string, number> = {}): Quote {
  const cat = (code: string) => catalog.find((c) => c.code === code)!;
  const q = (code: string) => overrides[code] ?? qtyOf(boq, code);
  const mk = (code: string, qty: number): QuoteLine => {
    const c = cat(code); const after = c.salePrice != null && c.salePrice > 0 ? c.salePrice : Math.round(c.price * (1 - c.discount));
    return { ...c, qty, after, total: after * qty, listTotal: c.price * qty };
  };
  const shQty: Record<string, number> = {
    sw1: q("sw1"), sw2: q("sw2"), sw3: q("sw3"), sw4: q("sw4"), hub: (s.hubModel ?? "hub") === "hub" ? q("hub") : 0, hub_pb650: s.hubModel === "hub_pb650" ? q("hub") : 0, zigbee: q("zigbee"), ir: q("ir"),
    gate_ab: overrides.gate_ab ?? 0,
    gate_sw: overrides.gate_sw ?? 0,
    curtain_sw: q("curtain_sw"), curtain_motor: q("curtain_motor"), rail: q("rail"),
    cam_in: q("cam_in"), cam_out: q("cam_out"),
  };
  const sections: QuoteSection[] = [];
  for (const key of ["lighting_ctrl", "gate", "curtain", "camera"] as const) {
    const lines = catalog.filter((c) => c.section === key).map((c) => mk(c.code, shQty[c.code] ?? 0)).filter((l) => l.qty > 0 && l.price > 0);
    if (!lines.length) continue;
    sections.push({ key, title: SECTIONS[key], lines, total: lines.reduce((a, l) => a + l.total, 0), listTotal: lines.reduce((a, l) => a + l.listTotal, 0) });
  }
  // renumber section roman numerals in order of appearance
  const roman = ["I", "II", "III", "IV", "V"];
  sections.forEach((sec, i) => { sec.title = sec.title.replace(/^[IVX]+\./, roman[i] + "."); });

  const niem = sections.reduce((a, x) => a + x.listTotal, 0);
  const sau = sections.reduce((a, x) => a + x.total, 0);
  const giam = sau - niem;
  // items with freeInstall (cổng AB Gate) are installed free when the customer takes the FPT Smart Home package
  const freeList = sections.flatMap((x) => x.lines).filter((l) => l.freeInstall).reduce((a, l) => a + l.listTotal, 0);
  const lapDat = Math.round((niem - freeList) * s.installRate);
  const kmLapDat = Math.round(freeList * s.installRate);
  const shTotal = sau + lapDat;

  // smart FPT lights first so the customer sees clearly which fixtures are smart and which are ordinary
  const lightQty: Record<string, number> = { athena: 0, downlight_fpt: 0, spotlight_ab: 0, downlight_ab: 0, tube_ab: 0 };
  lightQty[s.defaultDownlight] += q("downlight");
  lightQty[s.defaultSpotlight ?? "spotlight_ab"] += q("spotlight");
  for (const k of Object.keys(lightQty)) if (overrides[`light_${k}`] != null) lightQty[k] = overrides[`light_${k}`];
  const lightLines: QuoteLine[] = Object.entries(lightQty).filter(([, n]) => n > 0).map(([code, n]) => {
    const c = cat(code); return { ...c, qty: n, after: c.price, total: c.price * n, listTotal: c.price * n };
  });
  // what it would cost (after lighting discount) to upgrade every ordinary AB light to its FPT smart equivalent
  const SMART_EQ: Record<string, string> = { downlight_ab: "downlight_fpt", spotlight_ab: "athena" };
  const upgradeLines = lightLines.filter((l) => !l.smart && SMART_EQ[l.code]);
  const upgrade = {
    qty: upgradeLines.reduce((a, l) => a + l.qty, 0),
    extra: Math.round(upgradeLines.reduce((a, l) => a + (cat(SMART_EQ[l.code]).price - l.price) * l.qty, 0) * (1 - s.lightDiscount)),
  };
  // STC proposal: extra spotlights the drawing does not have — separate line so the customer sees it
  const propQty = s.includeProposal ? overrides.light_prop ?? q("spotlight_prop") : 0;
  if (propQty > 0) {
    const c = cat(s.proposalSpot ?? "athena");
    lightLines.push({ ...c, code: `prop_${c.code}`, name: `${c.name} – ĐỀ XUẤT THÊM`, qty: propQty, after: c.price, total: c.price * propQty, listTotal: c.price * propQty, proposed: true });
  }
  const lNiem = lightLines.reduce((a, l) => a + l.total, 0);
  const lCk = Math.round(lNiem * s.lightDiscount);
  const lInstall = Math.round(lNiem * s.lightInstall);
  const lTotal = lNiem - lCk + lInstall;

  const grandTotal = shTotal + lTotal;
  return {
    sections, niem, giam, sau, lapDat, kmLapDat, freeList, shTotal, shWords: docSo(shTotal),
    lightLines, lNiem, lCk, lInstall, lTotal, upgrade,
    grandNiem: niem + lNiem, grandGiam: giam - lCk, grandTotal, grandWords: docSo(grandTotal),
  };
}
