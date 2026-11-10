// Nạp BÁO GIÁ CÓ SẴN (PDF/Excel do AI đọc ra) → takeoff JSON để app dựng lại theo mẫu STC + link online.
// Thuần (không gọi mạng) để test được.
import type { CatalogItem, Settings } from "./types.ts";
import type { TakeoffJSON } from "./takeoff.ts";

export interface ReadItem { name: string; unit?: string | null; qty: number | null; price: number | null; discount?: number | null; after?: number | null; total?: number | null; group?: string | null }
export interface ReadTotals { shList?: number | null; shDiscount?: number | null; shInstall?: number | null; shTotal?: number | null; lightList?: number | null; lightDiscount?: number | null; lightInstall?: number | null; lightTotal?: number | null; grandTotal?: number | null }
export interface QuoteRead { customer?: string | null; address?: string | null; date?: string | null; items: ReadItem[]; totals?: ReadTotals }

const n = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.-]/g, "")) || 0 : 0);
const low = (s: string) => s.toLowerCase().normalize("NFC");

/** Mã hàng theo tên dòng báo giá (null = không nhận ra → cảnh báo). */
export function codeOf(name: string): string | null {
  const t = low(name);
  if (/âm sàn|ab ?gate|động cơ cổng|motor cổng/.test(t) && !/công tắc/.test(t)) return "gate_ab";
  if (/công tắc.*(cổng|cửa cuốn)/.test(t)) return "gate_sw";
  if (/công tắc.*rèm/.test(t)) return "curtain_sw";
  if (/động cơ.*rèm|motor.*rèm/.test(t)) return "curtain_motor";
  if (/ray|thanh ray/.test(t)) return "rail";
  const sw = /công tắc.*?([1-4])\s*nút/.exec(t);
  if (sw) return `sw${sw[1]}`;
  if (/play ?box|pb ?650/.test(t)) return "hub_pb650";
  if (/t950|trung tâm/.test(t)) return "hub";
  if (/mở rộng sóng|zigbee/.test(t)) return "zigbee";
  if (/\bir\b|hồng ngoại|điều hòa/.test(t)) return "ir";
  if (/se ?2s|outdoor|ngoài trời/.test(t) && /camera/.test(t)) return "cam_out";
  if (/camera/.test(t)) return "cam_in";
  if (/gắn tường|ốp tường|wall/.test(t) && !/ổ cắm|công tắc|camera/.test(t)) return "wall_ab";
  if (/ống bơ/.test(t)) return "tube_ab";
  if (/spot ?light/.test(t)) return /athena|thông minh|ble|bluetooth/.test(t) && !/thường/.test(t) ? "athena" : "spotlight_ab";
  if (/down ?light/.test(t)) return /athena|thông minh|cct|ble|bluetooth/.test(t) && !/thường/.test(t) ? "downlight_fpt" : "downlight_ab";
  if (/cảm biến hiện diện|presence/.test(t)) return "presence";
  if (/cảm biến cửa/.test(t)) return "door_sensor";
  if (/khói/.test(t)) return "smoke";
  if (/còi/.test(t)) return "siren";
  if (/ổ cắm/.test(t)) return "smart_socket";
  return null;
}

const round2 = (x: number) => Math.round(x * 10000) / 10000;
const mode = (xs: number[]) => {
  const m = new Map<number, number>(); xs.forEach((x) => m.set(x, (m.get(x) ?? 0) + 1));
  return [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
};
/** tỷ lệ "tròn" (vd 0.15) nếu amount/base gần đúng một số % nguyên */
function niceRate(amount: number, base: number): number | null {
  if (!base) return null;
  const r = amount / base; const p = Math.round(r * 100) / 100;
  return Math.abs(Math.round(base * p) - amount) <= 1 ? p : null;
}

export interface ImportResult { takeoff: TakeoffJSON; warnings: string[]; mapped: { name: string; code: string; qty: number }[] }

export function quoteToTakeoff(reads: QuoteRead[], catalog: CatalogItem[], meta: { customer?: string; address?: string; date?: string; sourceName: string }): ImportResult {
  const warnings: string[] = [];
  const cat = new Map(catalog.map((c) => [c.code, c]));
  const items = reads.flatMap((r) => r.items ?? []).filter((i) => n(i.qty) > 0 && (n(i.price) > 0 || n(i.after) > 0));
  // gộp dòng trùng hệt nhau (cùng tên/SL/giá – thường do trang lặp)
  const seen = new Set<string>();
  const uniq = items.filter((i) => { const k = `${low(i.name)}|${n(i.qty)}|${n(i.price)}`; if (seen.has(k)) return false; seen.add(k); return true; });

  const qty: Record<string, number> = {}; const price: Record<string, number> = {}; const disc: Record<string, number> = {};
  const mapped: ImportResult["mapped"] = [];
  let hubModel: Settings["hubModel"] | undefined;
  const add = (code: string, q: number, p: number, d: number, name: string) => {
    qty[code] = (qty[code] ?? 0) + q; price[code] = p; disc[code] = d; mapped.push({ name, code, qty: q });
  };
  for (const it of uniq) {
    const q = n(it.qty); const p = n(it.price) || n(it.after);
    let d = it.discount != null && n(it.discount) > 0 ? n(it.discount) : 0;
    if (d > 1) d = d / 100;
    if (!d && n(it.after) > 0 && p > 0) d = 1 - n(it.after) / p;
    if (!d && n(it.total) > 0 && p > 0) d = 1 - n(it.total) / (p * q);
    d = Math.max(0, round2(d));
    const t = low(it.name);
    // dòng gộp "Bộ trung tâm + mở rộng sóng" → tách 2 mã cùng % giảm
    if (/trung tâm/.test(t) && /mở rộng|zigbee/.test(t)) {
      const z = cat.get("zigbee")?.price ?? 429000;
      const hub: "hub" | "hub_pb650" = /t950/.test(t) || Math.abs(p - z - (cat.get("hub")?.price ?? 2409000)) < Math.abs(p - z - (cat.get("hub_pb650")?.price ?? 3900000)) ? "hub" : "hub_pb650";
      hubModel = hub; add(hub, q, p - z, d, it.name); add("zigbee", q, z, d, it.name + " (mở rộng sóng)");
      continue;
    }
    const code = codeOf(it.name);
    if (!code || !cat.has(code)) { warnings.push(`Không nhận ra: “${it.name}” (SL ${q}, ${p.toLocaleString("vi-VN")}đ) – thêm tay ở bước báo giá`); continue; }
    if (code === "hub" || code === "hub_pb650") hubModel = code;
    if (qty[code] && price[code] !== p) warnings.push(`“${it.name}”: cùng mã ${code} nhưng khác đơn giá – đang lấy ${p.toLocaleString("vi-VN")}đ`);
    add(code, q, p, d, it.name);
  }

  const isLight = (c: string) => cat.get(c)?.section === "light";
  const shCodes = Object.keys(qty).filter((c) => !isLight(c));
  const lCodes = Object.keys(qty).filter(isLight);
  const opt: Partial<Settings> = { includeProposal: false, priceOverrides: {}, discountOverrides: {} };
  if (hubModel) opt.hubModel = hubModel === "hub_pb650" ? "hub_pb650" : "hub";
  for (const c of Object.keys(qty)) if (price[c] !== cat.get(c)!.price) opt.priceOverrides![c] = price[c];

  // % giảm Smart Home: % phổ biến nhất làm chung, dòng khác % thì ghi riêng
  const shD = mode(shCodes.filter((c) => c !== "gate_ab").map((c) => disc[c]));
  if (shD != null) opt.shDiscount = shD;
  for (const c of shCodes) if (disc[c] !== shD || c === "gate_ab") opt.discountOverrides![c] = disc[c];

  // phí lắp Smart Home: thử % trên giá niêm yết và trên giá sau giảm
  const T = Object.assign({}, ...reads.map((r) => Object.fromEntries(Object.entries(r.totals ?? {}).filter(([, v]) => v != null && n(v) !== 0)))) as ReadTotals;
  const gateIn = shCodes.includes("gate_ab");
  const shList = shCodes.filter((c) => c !== "gate_ab").reduce((a, c) => a + price[c] * qty[c], 0);
  const shSau = shCodes.filter((c) => c !== "gate_ab").reduce((a, c) => a + Math.round(price[c] * (1 - disc[c])) * qty[c], 0);
  if (T.shInstall != null) {
    const inst = n(T.shInstall);
    const rList = niceRate(inst, shList), rSale = niceRate(inst, shSau);
    if (rList != null) { opt.installRate = rList; opt.installOnSale = false; }
    else if (rSale != null) { opt.installRate = rSale; opt.installOnSale = true; }
    else { opt.installRate = round2(inst / shList); opt.installOnSale = false; warnings.push(`Phí lắp Smart Home ${inst.toLocaleString("vi-VN")}đ không ra % tròn – đang dùng ${(opt.installRate * 100).toFixed(2)}% giá niêm yết, kiểm tra lại`); }
  } else if (shCodes.length) warnings.push("Không đọc được phí lắp Smart Home – đang dùng % mặc định của app");

  // chiếu sáng: % chiết khấu chung + phí lắp
  if (lCodes.length) {
    const lD = mode(lCodes.map((c) => disc[c]));
    if (lD != null && lD > 0) opt.lightDiscount = lD;
    else if (T.lightDiscount != null && T.lightList) opt.lightDiscount = round2(n(T.lightDiscount) / n(T.lightList));
    if (new Set(lCodes.map((c) => disc[c])).size > 1) warnings.push("Các đèn có % chiết khấu khác nhau – app dùng 1 % chung cho chiếu sáng");
    const lList = lCodes.reduce((a, c) => a + price[c] * qty[c], 0);
    if (T.lightInstall != null) opt.lightInstall = niceRate(n(T.lightInstall), lList) ?? round2(n(T.lightInstall) / lList);
    else opt.lightInstall = 0;
  }

  // số lượng: mọi mã đều ghi rõ (0 nếu không có) để app không tự thêm theo bản vẽ
  const extras: Record<string, number> = {};
  for (const c of catalog) {
    if (c.section === "light") extras[`light_${c.code}`] = qty[c.code] ?? 0;
    else if (c.code === "hub_pb650") continue;
    else extras[c.code] = qty[c.code] ?? 0;
  }
  extras.hub = (qty.hub ?? 0) + (qty.hub_pb650 ?? 0);
  if (!gateIn) delete extras.gate_ab;

  // đối chiếu tổng in trên báo giá gốc
  const r = reads.find((x) => x.customer) ?? reads[0];
  const takeoff: TakeoffJSON = {
    version: 1,
    project: {
      customer: meta.customer || r?.customer || "Khách hàng", address: meta.address || r?.address || "Đắk Lắk", date: meta.date || r?.date || undefined,
      sourceName: meta.sourceName, extras, options: { ...opt },
    },
    pages: [], detections: [],
  };
  return { takeoff, warnings, mapped };
}

/** Tổng in trên báo giá gốc (để so với app sau khi dựng lại). */
export function printedTotals(reads: QuoteRead[]) {
  const T = Object.assign({}, ...reads.map((r) => Object.fromEntries(Object.entries(r.totals ?? {}).filter(([, v]) => v != null && n(v) !== 0)))) as ReadTotals;
  return { sh: T.shTotal != null ? n(T.shTotal) : null, light: T.lightTotal != null ? n(T.lightTotal) : null, grand: T.grandTotal != null ? n(T.grandTotal) : null };
}
