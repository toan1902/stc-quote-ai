import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planTiles, owns, pageToCrop } from "../lib/core/tiling.ts";
import { itemsToDetections, dedupe, applyVerify } from "../lib/core/merge.ts";
import { parseCircuits, splitGangs } from "../lib/core/circuits.ts";
import { importTakeoff, validateTakeoff, exportTakeoff, type TakeoffJSON } from "../lib/core/takeoff.ts";
import { buildBOQ, qtyOf } from "../lib/core/boq.ts";
import { crossCheck } from "../lib/core/crosscheck.ts";
import { computeQuote } from "../lib/core/pricing.ts";
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from "../lib/core/catalog.ts";
import { docSo } from "../lib/core/words.ts";
import { assignRooms } from "../lib/core/rooms.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/anh-cuong.takeoff.json", import.meta.url), "utf8")) as TakeoffJSON;
const load = () => importTakeoff(fixture, "06/11/2026");

test("tiling: every point of the frame is owned by exactly one tile", () => {
  const frame = { x: 0.12, y: 0.06, w: 0.5, h: 0.8 };
  const tiles = planTiles(frame, 842 / 1191);
  assert.ok(tiles.length >= 4);
  for (let i = 0; i <= 200; i++) for (let j = 0; j <= 200; j++) {
    const x = frame.x + (frame.w * i) / 200, y = frame.y + (frame.h * j) / 200;
    assert.equal(tiles.filter((t) => owns(t, x, y)).length, 1, `point ${x},${y}`);
  }
});

test("tiling+merge: 400 synthetic symbols incl. seams → 400 counted, 0 duplicates", () => {
  const frame = { x: 0.1, y: 0.1, w: 0.6, h: 0.6 };
  const tiles = planTiles(frame, 1);
  const pts: { x: number; y: number }[] = [];
  // 340 random-ish + 60 placed exactly on/near core seams
  for (let i = 0; i < 340; i++) pts.push({ x: frame.x + ((i * 37) % 997) / 997 * frame.w, y: frame.y + ((i * 71) % 991) / 991 * frame.h });
  const seamXs = [...new Set(tiles.map((t) => t.core.x))].slice(1);
  for (let i = 0; i < 60; i++) pts.push({ x: seamXs[i % seamXs.length] + (i % 3 - 1) * 1e-4, y: frame.y + (i + 0.5) / 60 * frame.h });
  let found = 0;
  for (const t of tiles) {
    // the model sees every symbol inside its crop (including the overlap margin)
    const inCrop = pts.filter((p) => p.x >= t.crop.x && p.x <= t.crop.x + t.crop.w && p.y >= t.crop.y && p.y <= t.crop.y + t.crop.h);
    const items = inCrop.map((p) => { const c = pageToCrop(t.crop, p.x, p.y); return { type: "downlight", box_2d: [c.y - 3, c.x - 3, c.y + 3, c.x + 3] }; });
    found += itemsToDetections(t, 1, items, 1).length;
  }
  assert.equal(found, 400);
});

test("merge: jitter dedupe & verify pass", () => {
  const d = (id: string, x: number) => ({ id, page: 1, type: "downlight" as const, x, y: 0.5, pass: 1 as const, status: "ok" as const });
  const { kept } = dedupe([d("a", 0.5), d("b", 0.502), d("c", 0.6)]);
  assert.equal(kept.length, 2);
  const tile = planTiles({ x: 0, y: 0, w: 1, h: 1 }, 1, { minGrid: 1, symbolFrac: 1 })[0];
  const v = applyVerify(kept, tile, 1, { remove: ["c"], add: [{ type: "switch", box_2d: [100, 100, 110, 110], circuits: "1,2" }] });
  assert.equal(v.filter((x) => x.status === "removed").length, 1);
  assert.equal(v.filter((x) => x.status === "disputed" && x.type === "switch").length, 1);
});

test("circuits parsing", () => {
  assert.deepEqual(parseCircuits("13,14,15 (2 chiều)"), ["13", "14", "15"]);
  assert.deepEqual(parseCircuits("Line 45A, 46A"), ["45A", "46A"]);
  assert.deepEqual(parseCircuits("1,2 + 3,4"), ["1", "2", "3", "4"]);
  assert.deepEqual(splitGangs(6), [4, 2]);
});

test("rooms: nearest label fallback", () => {
  const r = assignRooms([{ id: "a", page: 1, type: "downlight", x: 0.2, y: 0.2, pass: 1, status: "ok" }], [{ page: 1, name: "P.NGỦ 1", x: 0.21, y: 0.2 }, { page: 1, name: "WC", x: 0.8, y: 0.8 }]);
  assert.equal(r[0].room, "P.NGỦ 1");
});

test("fixture: takeoff validates and round-trips", () => {
  assert.deepEqual(validateTakeoff(fixture), []);
  const p = load();
  assert.equal(exportTakeoff(p).detections.length, p.detections.length);
});

test("fixture: BOQ matches manual M&E takeoff (Anh Cường)", () => {
  const b = buildBOQ(load(), DEFAULT_SETTINGS);
  assert.equal(qtyOf(b, "downlight"), 68);
  assert.equal(qtyOf(b, "sw1"), 1);
  assert.equal(qtyOf(b, "sw2"), 1);
  assert.equal(qtyOf(b, "sw3"), 7);
  assert.equal(qtyOf(b, "sw4"), 2);
  assert.equal(b.switches.length, 11);
  assert.equal(qtyOf(b, "cam_out"), 3);
  assert.equal(qtyOf(b, "cam_in"), 2);
  assert.equal(qtyOf(b, "ir"), 3);
  assert.equal(qtyOf(b, "curtain_motor"), 2);
  assert.equal(qtyOf(b, "rail"), 8);
  assert.equal(qtyOf(b, "wall_light"), 4);
  assert.equal(qtyOf(b, "tube_light"), 1);
  assert.equal(qtyOf(b, "exhaust_fan"), 2);
  assert.equal(qtyOf(b, "led_strip"), 77);
  assert.equal(qtyOf(b, "hub"), 1);
});

test("fixture: cross-check flags Line 15 without load and nothing else critical", () => {
  const cc = crossCheck(load());
  assert.ok(cc.some((c) => c.code === "C1" && c.message.startsWith("Line 15")));
  assert.equal(cc.filter((c) => c.severity === "error").length, 0);
  assert.equal(cc.filter((c) => c.code === "C3" || c.code === "C4" || c.code === "C5").length, 0);
});

test("fixture: quote totals identical to the approved PDF/Excel (prices of that day)", () => {
  // the approved quote used IR 899k and curtain motor 3.774M (before the FPT retail list of 07/11/2026)
  const oldCat = DEFAULT_CATALOG.map((c) => (c.code === "ir" ? { ...c, price: 899000 } : c.code === "curtain_motor" ? { ...c, price: 3774000 } : c));
  const q = computeQuote(buildBOQ(load(), DEFAULT_SETTINGS), oldCat, DEFAULT_SETTINGS);
  assert.equal(q.niem, 49730000);
  assert.equal(q.giam, -10657900);
  assert.equal(q.lapDat, 7459500);
  assert.equal(q.shTotal, 46531600);
  assert.equal(q.lTotal, 10961600);
  assert.equal(q.grandTotal, 57493200);
  assert.equal(q.grandWords, "Năm mươi bảy triệu bốn trăm chín mươi ba ngàn hai trăm đồng chẵn");
  assert.equal(q.shWords, "Bốn mươi sáu triệu năm trăm ba mươi mốt ngàn sáu trăm đồng chẵn");
});

test("words edge cases", () => {
  assert.equal(docSo(104778600), "Một trăm linh bốn triệu bảy trăm bảy mươi tám ngàn sáu trăm đồng chẵn");
  assert.equal(docSo(1005000), "Một triệu không trăm linh năm ngàn đồng chẵn");
  assert.equal(docSo(21000), "Hai mươi mốt ngàn đồng chẵn");
});

test("review edits change BOQ (US2/AC2) and export gate (US2/AC3)", async () => {
  const { canExport } = await import("../lib/core/boq.ts");
  const p = load();
  const firstDown = p.detections.find((d) => d.type === "downlight")!;
  const edited = { ...p, detections: p.detections.map((d) => (d.id === firstDown.id ? { ...d, status: "removed" as const } : d)) };
  assert.equal(qtyOf(buildBOQ(edited, DEFAULT_SETTINGS), "downlight"), 67);
  const added = { ...p, detections: [...p.detections, { id: "m1", page: 4, type: "switch" as const, x: 0.9, y: 0.9, circuits: "30,31,32", pass: "manual" as const, status: "ok" as const }] };
  assert.equal(qtyOf(buildBOQ(added, DEFAULT_SETTINGS), "sw3"), 8);
  assert.equal(canExport({ status: "draft" }), false);
  assert.equal(canExport({ status: "reviewed" }), true);
});

test("multi-floor: curtains and AC keep their floor", () => {
  const p = load();
  p.pages.push({ index: 20, discipline: "hvac", floor: "Tầng 2", confidence: 1, analysed: true });
  p.detections.push({ id: "ac2", page: 20, type: "ac_indoor", x: 0.5, y: 0.5, room: "P.Ngủ 4", pass: "manual", status: "ok" });
  const b = buildBOQ(p, DEFAULT_SETTINGS);
  assert.equal(qtyOf(b, "ir"), 4);
  assert.equal(b.acFloors[b.acRooms.indexOf("P.Ngủ 4")], "Tầng 2");
  assert.ok(b.curtains.every((c) => c.floor === "Tầng 1"));
});

test("classify by PDF text: keep electrical sheets, skip water/structure", async () => {
  const { classifyByText, floorOf } = await import("../lib/core/classify.ts");
  assert.equal(classifyByText("MẶT BẰNG CHIẾU SÁNG TẦNG 1 ME-06")?.discipline, "lighting");
  assert.equal(classifyByText("MAT BANG CAP NGUON O CAM")?.discipline, "power");
  assert.equal(classifyByText("Mặt bằng điện nhẹ - camera, mạng")?.discipline, "low_voltage");
  assert.equal(classifyByText("MẶT BẰNG CẤP NƯỚC TẦNG 1")?.discipline, "other");
  assert.equal(classifyByText("SƠ ĐỒ NGUYÊN LÝ TỦ ĐIỆN DB-L1")?.discipline, "panel");
  assert.equal(classifyByText("BẢNG KÝ HIỆU CHUNG")?.discipline, "legend");
  assert.equal(classifyByText(""), null);
  assert.equal(floorOf("MẶT BẰNG CHIẾU SÁNG TẦNG 2"), "Tầng 2");
});

test("proposal: proposed spotlights are a separate priced line, excluded when unticked, no circuit warning", () => {
  const p = load();
  const pg = p.pages.find((x) => x.discipline === "lighting")!.index;
  for (let i = 0; i < 12; i++) p.detections.push({ id: `s${i}`, page: pg, type: "spotlight", x: 0.3 + i * 0.01, y: 0.6, room: i < 3 ? "P.Ngủ 1" : "Phòng khách", proposed: true, pass: "manual", status: "ok" });
  const boq = buildBOQ(p, DEFAULT_SETTINGS);
  assert.equal(qtyOf(boq, "spotlight_prop"), 12);
  assert.equal(qtyOf(boq, "downlight"), qtyOf(buildBOQ(load(), DEFAULT_SETTINGS), "downlight"), "base downlights unchanged");
  assert.equal(boq.proposals.length, 1);
  assert.deepEqual(boq.proposals[0].byRoom.find((r) => r.room === "P.Ngủ 1")?.qty, 3);
  const base = computeQuote(buildBOQ(load(), DEFAULT_SETTINGS), DEFAULT_CATALOG, DEFAULT_SETTINGS);
  const withP = computeQuote(boq, DEFAULT_CATALOG, DEFAULT_SETTINGS);
  const line = withP.lightLines.find((l) => l.proposed)!;
  assert.equal(line.qty, 12); assert.equal(line.price, 869000);
  assert.equal(withP.lTotal - base.lTotal, 12 * 869000 - Math.round(withP.lNiem * 0.35) + Math.round(base.lNiem * 0.35));
  const off = computeQuote(boq, DEFAULT_CATALOG, { ...DEFAULT_SETTINGS, includeProposal: false });
  assert.equal(off.grandTotal, base.grandTotal);
  assert.ok(!crossCheck(p).some((c) => c.message.includes("chưa đọc được số mạch") && c.detectionIds.some((id) => id.startsWith("s"))));
});

test("gate AB: only quoted once a price is set; separate item (Phần 3) + 1 gate switch in Smart Home", () => {
  const boq = buildBOQ(load(), DEFAULT_SETTINGS);
  const q0 = computeQuote(boq, DEFAULT_CATALOG.map((c) => (c.code === "gate_ab" ? { ...c, price: 0 } : c)), DEFAULT_SETTINGS, { gate_ab: 1, gate_sw: 1 });
  assert.equal(q0.gateLines?.length ?? 0, 0, "price 0 → not quoted");
  const q = computeQuote(boq, DEFAULT_CATALOG, DEFAULT_SETTINGS, { gate_ab: 1, gate_sw: 1 });
  assert.ok(!q.sections.flatMap((s) => s.lines).some((l) => l.code === "gate_ab"), "bộ cổng không nằm trong Smart Home");
  const gl = q.sections.find((s) => s.key === "gate")!;
  assert.deepEqual(gl.lines.map((l) => [l.code, l.qty]), [["gate_sw", 1]]);
  assert.deepEqual(q.gateLines!.map((l) => [l.code, l.qty]), [["gate_ab", 1]]);
  assert.ok(q.gateLines![0].vn);
});

test("AB Gate separate like lighting: 38.390.000 list → 30.000.000, install free (15% promo), grand total = SH + đèn + cổng", () => {
  const boq = buildBOQ(load(), DEFAULT_SETTINGS);
  const base = computeQuote(boq, DEFAULT_CATALOG, DEFAULT_SETTINGS);
  const q = computeQuote(boq, DEFAULT_CATALOG, DEFAULT_SETTINGS, { gate_ab: 1, gate_sw: 1 });
  const g = q.gateLines![0];
  assert.equal(g.price, 38390000); assert.equal(g.after, 30000000);
  assert.equal(q.kmLapDat, 5758500);
  assert.equal(q.gNiem, 38390000); assert.equal(q.gGiam, -8390000); assert.equal(q.gInstall, 0); assert.equal(q.gTotal, 30000000);
  const sw = q.sections.flatMap((s) => s.lines).find((l) => l.code === "gate_sw")!;
  assert.equal(q.shTotal - base.shTotal, sw.after + Math.round(sw.price * 0.15), "Smart Home chỉ tăng công tắc cổng");
  assert.equal(q.grandTotal, q.shTotal + q.lTotal + 30000000);
  assert.equal(q.grandNiem - base.grandNiem, 38390000 + sw.price);
});

test("lighting: AB lights labelled ordinary, FPT smart prices match FPT retail list, upgrade cost computed", () => {
  const boq = buildBOQ(load(), DEFAULT_SETTINGS);
  const cat = (c: string) => DEFAULT_CATALOG.find((x) => x.code === c)!;
  assert.equal(cat("athena").price, 869000); assert.ok(cat("athena").smart);
  assert.equal(cat("downlight_fpt").price, 484000); assert.ok(cat("downlight_fpt").smart);
  for (const c of ["downlight_ab", "spotlight_ab", "tube_ab"]) { assert.ok(!cat(c).smart); assert.match(cat(c).name, /THƯỜNG/); }
  const q = computeQuote(boq, DEFAULT_CATALOG, DEFAULT_SETTINGS);
  const n = qtyOf(boq, "downlight");
  assert.equal(q.upgrade.qty, n);
  assert.equal(q.upgrade.extra, Math.round((484000 - 248000) * n * 0.65));
  const smart = computeQuote(boq, DEFAULT_CATALOG, { ...DEFAULT_SETTINGS, defaultDownlight: "downlight_fpt" });
  assert.equal(smart.lightLines[0].code, "downlight_fpt"); assert.equal(smart.upgrade.qty, 0);
  assert.equal(smart.lTotal - q.lTotal, q.upgrade.extra);
});

test("FPT retail prices: IR 759k, AOK motor 3.3M, gate switch 2.079M; hub price follows the chosen model", () => {
  const cat = (c: string) => DEFAULT_CATALOG.find((x) => x.code === c)!;
  assert.equal(cat("ir").price, 759000); assert.equal(cat("curtain_motor").price, 3300000); assert.equal(cat("gate_sw").price, 2079000);
  const boq = buildBOQ(load(), DEFAULT_SETTINGS);
  const lines = (s: typeof DEFAULT_SETTINGS) => computeQuote(boq, DEFAULT_CATALOG, s).sections.flatMap((x) => x.lines);
  const t950 = lines(DEFAULT_SETTINGS).find((l) => l.code === "hub")!;
  assert.equal(t950.price, 2409000);
  const pb = lines({ ...DEFAULT_SETTINGS, hubModel: "hub_pb650" });
  assert.ok(!pb.some((l) => l.code === "hub"));
  const pbl = pb.find((l) => l.code === "hub_pb650")!;
  assert.equal(pbl.price, 3900000); assert.equal(pbl.qty, t950.qty);
});

test("Anh Tài (3 tầng, công tắc không toạ độ, số nút ước tính): đúng số lượng & tổng = báo giá PDF", () => {
  const t = JSON.parse(readFileSync(new URL("./fixtures/anh-tai.takeoff.json", import.meta.url), "utf8")) as TakeoffJSON;
  const p = importTakeoff(t, "07/11/2026");
  const s = { ...DEFAULT_SETTINGS, ...(p.options ?? {}) };
  const b = buildBOQ(p, s);
  assert.deepEqual([1, 2, 3, 4].map((g) => qtyOf(b, `sw${g}`)), [3, 8, 7, 2]);
  assert.equal(qtyOf(b, "hub"), 2); assert.equal(qtyOf(b, "zigbee"), 1);
  assert.equal(qtyOf(b, "ir"), 3); assert.equal(qtyOf(b, "cam_out"), 1);
  assert.equal(crossCheck(p).filter((c) => c.severity !== "info").length, 0);
  const q = computeQuote(b, DEFAULT_CATALOG, s, p.extras as Record<string, number>);
  assert.deepEqual(q.lightLines.map((l) => [l.code, l.qty]), [["downlight_ab", 91], ["tube_ab", 21]]);
  assert.ok(q.sections.flatMap((x) => x.lines).some((l) => l.code === "gate_sw" && l.qty === 1));
  assert.equal(q.grandTotal, 77784150);
});

test("SL sửa tay: ghi đè số theo bản vẽ, 0 = bỏ hạng mục, thêm hạng mục ngoài bản vẽ", () => {
  const p = load(); const b = buildBOQ(p, DEFAULT_SETTINGS);
  const q = computeQuote(b, DEFAULT_CATALOG, DEFAULT_SETTINGS, { sw3: 1, cam_in: 0, gate_sw: 2, light_downlight_ab: 70 });
  const ln = (c: string) => q.sections.flatMap((x) => x.lines).find((l) => l.code === c);
  assert.equal(ln("sw3")?.qty, 1); assert.equal(ln("cam_in"), undefined); assert.equal(ln("gate_sw")?.qty, 2);
  assert.equal(q.lightLines.find((l) => l.code === "downlight_ab")?.qty, 70);
});

test("Phân loại hồ sơ BVTC đầy đủ: khung tên 'kiến trúc' lặp lại không làm mất trang điện; trang danh mục bị bỏ", async () => {
  const { classifyByText, stripBoilerplate } = await import("../lib/core/classify.ts");
  const box = ["BVTC KIẾN TRÚC ĐIỆN NƯỚC", "NHÀ Ở TƯ NHÂN ANH TÀI", "KTS. PHAN CÔNG THÔNG"];
  const pages = [
    ["DANH SÁCH BẢN VẼ", "MẶT BẰNG KIẾN TRÚC TẦNG 1", "MẶT BẰNG CẤP ĐIỆN TẦNG 1", "CẤP ĐIỆN TRẦN ĐÈN TẦNG 1", "MẶT BẰNG CẤP NƯỚC TẦNG 1", "MẶT BẰNG THOÁT NƯỚC TẦNG 1"],
    ["MẶT BẰNG KIẾN TRÚC TẦNG 1", "PHỐI CẢNH"],
    ["MẶT BẰNG CẤP ĐIỆN", "TẦNG HẦM", "CAMERA", "CB MÁY LẠNH"],
    ["BẢNG KÍ HIỆU", "CẤP ĐIỆN TRẦN ĐÈN", "ĐÈN TRANG TRÍ CẦU THANG", "PHỐI CẢNH 3D", "CẤP ĐIỆN TRẦN ĐÈN TẦNG 2"],
    ["KÍCH THƯỚC BÓNG ĐÈN TẦNG 2", "CẤP ĐIỆN TRẦN ĐÈN"],
    ["MẶT BẰNG CẤP NƯỚC TẦNG 2"],
  ].map((p) => [...p, ...box]);
  const r = stripBoilerplate(pages).map((t) => classifyByText(t));
  assert.deepEqual(r.map((x) => x?.discipline), ["other", "other", "power", "lighting", "other", "other"]);
  assert.equal(r[2]?.floor, "Tầng hầm"); assert.equal(r[3]?.floor, "Tầng 2");
});

test("Công tắc CHỮ NHẬT + rèm + cảm biến thêm tay (Anh Hiếu, Ea Na): khớp báo giá PDF", () => {
  const t = JSON.parse(readFileSync(new URL("./fixtures/anh-hieu.takeoff.json", import.meta.url), "utf8")) as TakeoffJSON;
  const p = importTakeoff(t, "08/11/2026");
  const s = { ...DEFAULT_SETTINGS, ...(p.options ?? {}) };
  assert.equal(s.switchShape, "rect");
  const b = buildBOQ(p, s);
  const q = computeQuote(b, DEFAULT_CATALOG, s, p.extras as Record<string, number>);
  const ln = (c: string) => q.sections.flatMap((x) => x.lines).find((l) => l.code === c);
  assert.equal(ln("sw3")?.price, 1969000); assert.match(ln("sw3")!.name, /CHỮ NHẬT/);
  assert.equal(ln("curtain_sw")?.price, 1529000);
  assert.equal(q.grandTotal, 47112450);
  const q2 = computeQuote(b, DEFAULT_CATALOG, s, { ...(p.extras as Record<string, number>), presence: 5 });
  assert.equal(q2.grandTotal - q.grandTotal, 5 * 1047200 + Math.round(5 * 1309000 * 0.15));
  assert.ok(q2.sections.some((x) => x.key === "sensor"));
});

test("Đề xuất thêm: hiện theo nhóm, KHÔNG cộng vào tổng (Anh Hiếu: 2 phương án đèn + cảm biến)", () => {
  const t = JSON.parse(readFileSync(new URL("./fixtures/anh-hieu.takeoff.json", import.meta.url), "utf8")) as TakeoffJSON;
  const p = importTakeoff(t, "08/11/2026");
  const s = { ...DEFAULT_SETTINGS, ...(p.options ?? {}) };
  const q = computeQuote(buildBOQ(p, s), DEFAULT_CATALOG, s, p.extras as Record<string, number>, p.proposals);
  assert.equal(q.grandTotal, 47112450);
  const g = Object.fromEntries(q.proposals.map((x) => [x.group, x.est]));
  assert.equal(g["Phương án A – đèn thường AB"], 14497600);
  assert.equal(g["Phương án B – đèn thông minh FPT"], 25396800);
  assert.equal(g["Cảm biến hiện diện nhà vệ sinh"], 5 * 1047200 + Math.round(1309000 * 0.15) * 5);
});

test("tuỳ chọn theo khách (takeoff options): giảm SH chung, lắp trên giá sau giảm, giá riêng, đèn gắn tường", () => {
  const boq = buildBOQ(load(), DEFAULT_SETTINGS);
  const s = { ...DEFAULT_SETTINGS, shDiscount: 0.3, installOnSale: true, priceOverrides: { gate_sw: 1639000 } };
  const q = computeQuote(boq, DEFAULT_CATALOG, s, { gate_sw: 1, light_wall_ab: 16 });
  const sw = q.sections.flatMap((x) => x.lines).find((l) => l.code === "gate_sw")!;
  assert.equal(sw.price, 1639000); assert.equal(sw.after, 1147300);
  assert.ok(q.sections.flatMap((x) => x.lines).every((l) => l.discount === 0.3));
  assert.equal(q.lapDat, Math.round(q.sau * 0.15));
  const w = q.lightLines.find((l) => l.code === "wall_ab")!;
  assert.equal(w.qty, 16); assert.equal(w.total, 16 * 888000);
});

test("nạp báo giá có sẵn (Anh Mạnh 0911): dựng lại khớp tổng 61.968.095 + 57.763.500", async () => {
  const { quoteToTakeoff, codeOf } = await import("../lib/core/quoteImport.ts");
  const { importTakeoff } = await import("../lib/core/takeoff.ts");
  assert.equal(codeOf("Đèn LED âm trần Spotlight góc 24 Athena 76/12W BLE thông minh"), "athena");
  assert.equal(codeOf("Đèn LED âm trần Spotlight thường"), "spotlight_ab");
  assert.equal(codeOf("2*5W, Gắn tường ngoài nhà"), "wall_ab");
  const it = (name: string, qty: number, price: number, discount: number, group = "smarthome") => ({ name, qty, price, discount, group });
  const sh = { customer: "Anh Mạnh", items: [
    it("Công tắc cảm ứng 1 nút", 4, 2079000, 0.3), it("Công tắc cảm ứng 2 nút", 9, 2079000, 0.3), it("Công tắc cảm ứng 3 nút", 6, 2079000, 0.3), it("Công tắc cảm ứng 4 nút", 5, 2079000, 0.3),
    it("Bộ điều khiển trung tâm và thiết bị mở rộng sóng", 1, 4329000, 0.3), it("Công tắc điều khiển động cơ cổng", 1, 1639000, 0.3),
    it("Công tắc điều khiển động cơ rèm", 3, 1639000, 0.3), it("Động cơ và phụ kiện rèm cửa kéo ngang", 2, 3774000, 0.3), it("Thanh ray rèm kéo ngang", 7, 550000, 0.3),
    it("FPT Camera SE 3 (Indoor 360°)", 2, 1100000, 0.3), it("FPT Camera SE 2S (Outdoor Cảnh Báo)", 2, 1300000, 0.3)],
    totals: { shList: 76979000, shDiscount: 23093700, shInstall: 8082795, shTotal: 61968095 } };
  const li = { items: [
    it("Đèn LED Downlight 9W", 20, 248000, 0.35, "light"), it("Đèn LED âm trần Spotlight góc 24 Athena 76/12W BLE thông minh", 30, 869000, 0.35, "light"),
    it("Đèn LED âm trần Spotlight thường", 31, 588000, 0.35, "light"), it("ĐÈN LED ỐNG BƠ 12W, 4000K", 14, 968000, 0.35, "light"), it("2*5W, Gắn tường ngoài nhà", 16, 888000, 0.35, "light")],
    totals: { lightList: 77018000, lightDiscount: 26956300, lightInstall: 7701800, lightTotal: 57763500 } };
  const r = quoteToTakeoff([sh, li], DEFAULT_CATALOG, { sourceName: "0911.pdf" });
  assert.deepEqual(r.warnings, []);
  const p = importTakeoff(r.takeoff, "10/11/2026");
  const s = { ...DEFAULT_SETTINGS, ...p.options };
  const q = computeQuote(buildBOQ(p, s), DEFAULT_CATALOG, s, p.extras as Record<string, number>);
  assert.equal(q.shTotal, 61968095); assert.equal(q.lTotal, 57763500); assert.equal(q.grandTotal, 119731595);
});
