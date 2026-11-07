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

test("fixture: quote totals identical to the approved PDF/Excel", () => {
  const q = computeQuote(buildBOQ(load(), DEFAULT_SETTINGS), DEFAULT_CATALOG, DEFAULT_SETTINGS);
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
