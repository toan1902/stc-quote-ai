import type { CatalogItem, Proposal, Settings } from "./types.ts";
import type { BOQResult } from "./boq.ts";
import { qtyOf } from "./boq.ts";
import { SECTIONS, applySwitchShape } from "./catalog.ts";
import { docSo } from "./words.ts";

export interface QuoteLine extends CatalogItem { qty: number; after: number; total: number; listTotal: number; proposed?: boolean }
export interface QuoteSection { key: string; title: string; lines: QuoteLine[]; total: number; listTotal: number }
export interface Quote {
  sections: QuoteSection[];
  niem: number; giam: number; sau: number; lapDat: number; kmLapDat: number; freeList: number; shTotal: number; shWords: string;
  lightLines: QuoteLine[]; lNiem: number; lCk: number; lInstall: number; lTotal: number;
  /** Cổng tự động âm sàn AB Gate – hạng mục riêng (như chiếu sáng), không nằm trong Smart Home.
   *  gInstall = phí lắp thực thu (0 khi được miễn phí lắp – KM thể hiện ở kmLapDat). */
  gateLines?: QuoteLine[]; gNiem?: number; gGiam?: number; gInstall?: number; gTotal?: number; gWords?: string;
  /** nâng cấp toàn bộ đèn thường AB → đèn thông minh FPT: số bộ và chi phí thêm (sau chiết khấu) */
  upgrade: { qty: number; extra: number };
  grandNiem: number; grandGiam: number; grandTotal: number; grandWords: string;
  /** đề xuất thêm – KHÔNG cộng vào tổng; mỗi nhóm có tổng dự kiến (sau giảm giá + lắp đặt) */
  proposals: ProposalGroup[];
}
export interface ProposalLine extends QuoteLine { install: number; est: number; note?: string }
export interface ProposalGroup { group: string; lines: ProposalLine[]; niem: number; est: number }

export function computeQuote(boq: BOQResult, catalog0: CatalogItem[], s: Settings, overrides: Record<string, number> = {}, props: Proposal[] = []): Quote {
  const SH_SEC = new Set(["lighting_ctrl", "gate", "curtain", "camera", "sensor"]);
  const catalog = applySwitchShape(catalog0, s.switchShape).map((c) => {
    const price = s.priceOverrides?.[c.code] ?? c.price;
    const own = s.discountOverrides?.[c.code];
    const shD = own == null && s.shDiscount != null && SH_SEC.has(c.section) && !(c.salePrice != null && c.salePrice > 0);
    if (price === c.price && !shD && own == null) return c;
    return { ...c, price, discount: own ?? (shD ? s.shDiscount! : c.discount), ...(own != null ? { salePrice: undefined } : {}) };
  });
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
  const gateLines: QuoteLine[] = shQty.gate_ab > 0 && (cat("gate_ab")?.price ?? 0) > 0 ? [mk("gate_ab", shQty.gate_ab)] : [];
  const sections: QuoteSection[] = [];
  for (const key of ["lighting_ctrl", "gate", "curtain", "sensor", "camera"] as const) {
    // bộ cổng AB Gate tách thành hạng mục riêng (gateLines), Smart Home chỉ giữ công tắc điều khiển cổng
    const lines = catalog.filter((c) => c.section === key && c.code !== "gate_ab").map((c) => mk(c.code, shQty[c.code] ?? overrides[c.code] ?? 0)).filter((l) => l.qty > 0 && l.price > 0);
    if (!lines.length) continue;
    const title = key === "gate" ? (gateLines.length ? "II. Giải pháp điều khiển cổng tự động" : "II. Giải pháp điều khiển cửa cuốn / cổng") : SECTIONS[key];
    sections.push({ key, title, lines, total: lines.reduce((a, l) => a + l.total, 0), listTotal: lines.reduce((a, l) => a + l.listTotal, 0) });
  }
  // renumber section roman numerals in order of appearance
  const roman = ["I", "II", "III", "IV", "V", "VI", "VII"];
  sections.forEach((sec, i) => { sec.title = sec.title.replace(/^[IVX]+\./, roman[i] + "."); });

  const niem = sections.reduce((a, x) => a + x.listTotal, 0);
  const sau = sections.reduce((a, x) => a + x.total, 0);
  const giam = sau - niem;
  const freeList = 0; // (cũ) cổng đã tách khỏi Smart Home
  const lapDat = Math.round((s.installOnSale ? sau : niem) * s.installRate);
  const shTotal = sau + lapDat;
  // cổng AB Gate: lắp đặt, cài hành trình miễn phí khi chọn hệ sinh thái FPT Smart Home (freeInstall)
  const gNiem = gateLines.reduce((a, l) => a + l.listTotal, 0);
  const gSau = gateLines.reduce((a, l) => a + l.total, 0);
  const gGiam = gSau - gNiem;
  const gLd = gateLines.reduce((a, l) => a + Math.round(l.listTotal * s.installRate), 0);
  const kmLapDat = gateLines.filter((l) => l.freeInstall).reduce((a, l) => a + Math.round(l.listTotal * s.installRate), 0);
  const gInstall = gLd - kmLapDat;
  const gTotal = gSau + gInstall;

  // smart FPT lights first so the customer sees clearly which fixtures are smart and which are ordinary
  const lightQty: Record<string, number> = { athena: 0, downlight_fpt: 0, spotlight_ab: 0, downlight_ab: 0, tube_ab: 0, wall_ab: 0 };
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

  const grandTotal = shTotal + lTotal + gTotal;
  // đề xuất thêm: đèn tính chiết khấu chiếu sáng (lắp 0đ theo cài đặt), thiết bị Smart Home tính giảm giá + 15% lắp đặt
  const groups = new Map<string, ProposalGroup>();
  for (const p of props) {
    const c = catalog.find((x) => x.code === p.code); if (!c || !(p.qty > 0)) continue;
    const isLight = c.section === "light";
    const after = isLight ? Math.round(c.price * (1 - s.lightDiscount)) : c.salePrice != null && c.salePrice > 0 ? c.salePrice : Math.round(c.price * (1 - c.discount));
    const install = Math.round(c.price * (isLight ? s.lightInstall : c.freeInstall ? 0 : s.installRate)) * p.qty;
    const line: ProposalLine = { ...c, qty: p.qty, after, total: after * p.qty, listTotal: c.price * p.qty, install, est: after * p.qty + install, note: p.note };
    const g = p.group?.trim() || "Hạng mục đề xuất thêm";
    const G = groups.get(g) ?? { group: g, lines: [], niem: 0, est: 0 };
    G.lines.push(line); G.niem += line.listTotal; G.est += line.est; groups.set(g, G);
  }
  return {
    proposals: [...groups.values()],
    sections, niem, giam, sau, lapDat, kmLapDat, freeList, shTotal, shWords: docSo(shTotal),
    lightLines, lNiem, lCk, lInstall, lTotal, upgrade,
    gateLines, gNiem, gGiam, gInstall, gTotal, gWords: docSo(gTotal),
    grandNiem: niem + lNiem + gNiem, grandGiam: giam - lCk + gGiam, grandTotal, grandWords: docSo(grandTotal),
  };
}
