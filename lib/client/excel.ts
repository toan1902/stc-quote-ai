"use client";
import type { Project, Settings } from "../core/types";
import type { BOQResult } from "../core/boq";
import type { Quote } from "../core/pricing";
import type { CrossCheck } from "../core/types";

const NAVY = "FF1D3A89", HDR = "FF0F172A", SEC = "FFE0F2FE", SECF = "FF0369A1", BLUE = "FF0000FF", GREEN = "FF008000";
const NUM = "#,##0;\\-#,##0;\\-";

/** 4-sheet Excel with live formulas (Principle V). Quantities link to the 'Bóc tách' sheet. */
export async function buildExcel(p: Project, boq: BOQResult, q: Quote, s: Settings, checks: CrossCheck[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const font = (o: Partial<{ bold: boolean; color: string; size: number; italic: boolean }> = {}) => ({ name: "Arial", size: o.size ?? 10, bold: o.bold, italic: o.italic, color: o.color ? { argb: o.color } : undefined });
  const border = { top: { style: "thin" as const, color: { argb: "FFCBD5E1" } }, left: { style: "thin" as const, color: { argb: "FFCBD5E1" } }, bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } }, right: { style: "thin" as const, color: { argb: "FFCBD5E1" } } };

  type WS = ReturnType<typeof wb.addWorksheet>;
  const header = (ws: WS, title: string, ncol: number) => {
    const rows = [
      ["CÔNG TY TNHH ĐẦU TƯ VÀ CÔNG NGHỆ STC", font({ bold: true, size: 13, color: NAVY })],
      ["Trụ sở: 104 Nguyễn Thượng Hiền, Phường Tân An, Tỉnh Đắk Lắk | MST: 6001584831 | Hotline: 0823 047 047 | TK: 0231 000 648 025 - Vietcombank CN Đắk Lắk", font({ size: 9 })],
      ["", font()],
      [title, font({ bold: true, size: 14, color: NAVY })],
      [`Kính gửi: ${p.customer} – ${p.address} | Ngày lập: ${p.date}`, font({ italic: true })],
      ["Ô chữ xanh dương = số liệu nhập (sửa được); chữ xanh lá = liên kết từ sheet khác; chữ đen = công thức.", font({ italic: true, size: 9 })],
    ] as const;
    rows.forEach(([t, f], i) => { const c = ws.getCell(i + 1, 1); c.value = t; c.font = f; ws.mergeCells(i + 1, 1, i + 1, ncol); });
  };
  const hrow = (ws: WS, r: number, labels: string[]) => {
    labels.forEach((l, i) => { const c = ws.getCell(r, i + 1); c.value = l; c.font = font({ bold: true, color: "FFFFFFFF" }); c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HDR } }; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; c.border = border; });
    ws.getRow(r).height = 30;
  };
  const secRow = (ws: WS, r: number, text: string, ncol: number) => {
    for (let c = 1; c <= ncol; c++) { const cell = ws.getCell(r, c); cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SEC } }; cell.font = font({ bold: true, color: SECF }); cell.border = border; }
    ws.getCell(r, 1).value = text;
  };

  const th = wb.addWorksheet("Tổng hợp");
  // ---------- Bóc tách ----------
  const bt = wb.addWorksheet("Bóc tách");
  header(bt, "BẢNG BÓC TÁCH THIẾT BỊ (BOQ) TỪ BẢN VẼ", 6);
  hrow(bt, 8, ["STT", "Hạng mục", "ĐVT", "SL", "Phòng / vị trí", "Phạm vi"]);
  const scopeTxt = { smarthome: "Smart Home", lighting: "Chiếu sáng", excluded: "Không báo giá" } as const;
  const rowOf: Record<string, number> = {};
  let r = 9, i = 0;
  for (const l of boq.lines) {
    if (!l.qty) continue;
    i++;
    bt.getRow(r).values = [i, l.name + (l.estimated ? " (ước tính)" : ""), l.unit, l.qty, l.rooms.filter((x) => x !== "?").join(", "), scopeTxt[l.scope]];
    bt.getCell(r, 4).font = font({ color: BLUE, bold: true });
    for (let c = 1; c <= 6; c++) bt.getCell(r, c).border = border;
    rowOf[l.code] = r; r++;
  }
  r++;
  secRow(bt, r, "VỊ TRÍ CÔNG TẮC", 6); r++;
  boq.switches.forEach((sw, k) => { bt.getRow(r).values = [k + 1, sw.room, "Vị trí", 1, `Công tắc ${sw.gangs} nút – ${sw.circuits.length ? "Line " + sw.circuits.join(",") : (sw.note || "số nút ước tính")}${sw.twoWay ? " (2 chiều)" : ""}`, sw.floor]; r++; });
  r++;
  if (checks.length) {
    secRow(bt, r, "CẢNH BÁO ĐỐI SOÁT CHÉO", 6); r++;
    checks.forEach((c) => { bt.getCell(r, 1).value = c.code; bt.getCell(r, 2).value = c.message; bt.mergeCells(r, 2, r, 6); bt.getCell(r, 2).alignment = { wrapText: true }; r++; });
  }
  [6, 38, 8, 8, 50, 16].forEach((w, k) => (bt.getColumn(k + 1).width = w));

  // ---------- Smart Home ----------
  const sh = wb.addWorksheet("Smart Home");
  header(sh, "BẢNG DỰ TOÁN SMART HOME FPT", 9);
  hrow(sh, 8, ["STT", "Tên thiết bị", "ĐVT", "SL", "Đơn giá niêm yết (đ)", "Giảm (%)", "Giá sau giảm (đ)", "Thành tiền (đ)", "Thành tiền niêm yết (đ)"]);
  const linkCode: Record<string, string> = { sw1: "sw1", sw2: "sw2", sw3: "sw3", sw4: "sw4", ir: "ir", curtain_sw: "curtain_sw", curtain_motor: "curtain_motor", rail: "rail", cam_in: "cam_in", cam_out: "cam_out", hub: "hub", hub_pb650: "hub", zigbee: "zigbee" };
  r = 9; let n = 0; const secRows: number[] = [];
  for (const sec of q.sections) {
    const sr = r; secRows.push(sr); secRow(sh, r, sec.title, 9); sh.mergeCells(r, 1, r, 7); r++;
    for (const l of sec.lines) {
      n++;
      const manual = p.extras?.[l.code === "hub_pb650" ? "hub" : l.code] != null; // số sửa tay → ghi số, không link Bóc tách
      const br = manual ? undefined : rowOf[linkCode[l.code]];
      sh.getRow(r).values = [n, l.name, l.unit, br ? { formula: `'Bóc tách'!D${br}` } : l.qty, l.price, l.discount,
        { formula: `ROUND(E${r}*(1-F${r}),0)` }, { formula: `G${r}*D${r}` }, { formula: `E${r}*D${r}` }];
      sh.getCell(r, 4).font = font({ color: br ? GREEN : BLUE });
      sh.getCell(r, 5).font = font({ color: BLUE }); sh.getCell(r, 6).font = font({ color: BLUE });
      sh.getCell(r, 6).numFmt = "0%";
      [5, 7, 8, 9].forEach((c) => (sh.getCell(r, c).numFmt = NUM));
      for (let c = 1; c <= 9; c++) sh.getCell(r, c).border = border;
      r++;
    }
    sh.getCell(sr, 8).value = { formula: `SUM(H${sr + 1}:H${r - 1})` }; sh.getCell(sr, 9).value = { formula: `SUM(I${sr + 1}:I${r - 1})` };
    sh.getCell(sr, 8).numFmt = NUM; sh.getCell(sr, 9).numFmt = NUM;
  }
  r++;
  const rate = r; sh.getCell(r, 2).value = "Tỷ lệ phí lắp đặt (trên giá niêm yết)"; sh.getCell(r, 8).value = s.installRate; sh.getCell(r, 8).numFmt = "0%"; sh.getCell(r, 8).font = font({ color: BLUE }); r++;
  const T: Record<string, number> = {};
  const totals: [string, string, string][] = [
    ["niem", "TỔNG GIÁ TRỊ THIẾT BỊ NIÊM YẾT", secRows.map((x) => `I${x}`).join("+")],
    ["giam", "GIẢM GIÁ ƯU ĐÃI THIẾT BỊ", ""],
    ["sau", "TỔNG GIÁ TRỊ THIẾT BỊ SAU GIẢM GIÁ", secRows.map((x) => `H${x}`).join("+")],
    ["ld", "CHI PHÍ LẮP ĐẶT, CÀI ĐẶT CẤU HÌNH", ""],
    ["tong", "TỔNG CỘNG GÓI GIẢI PHÁP HOÀN THIỆN", ""],
  ];
  for (const [k, label] of totals) { T[k] = r; sh.getCell(r, 2).value = label; sh.getCell(r, 2).font = font({ bold: true }); sh.mergeCells(r, 2, r, 7); r++; }
  sh.getCell(T.niem, 8).value = { formula: totals[0][2] || "0" };
  sh.getCell(T.sau, 8).value = { formula: totals[2][2] || "0" };
  sh.getCell(T.giam, 8).value = { formula: `H${T.sau}-H${T.niem}` };
  sh.getCell(T.ld, 8).value = { formula: q.freeList ? `ROUND((H${T.niem}-${q.freeList})*H${rate},0)` : `ROUND(H${T.niem}*H${rate},0)` };
  sh.getCell(T.tong, 8).value = { formula: `H${T.sau}+H${T.ld}` };
  Object.values(T).forEach((x) => { sh.getCell(x, 8).numFmt = NUM; sh.getCell(x, 8).font = font({ bold: true }); });
  sh.getCell(T.tong, 8).font = font({ bold: true, size: 11, color: "FFB91C1C" });
  [6, 50, 7, 7, 18, 9, 17, 17, 19].forEach((w, k) => (sh.getColumn(k + 1).width = w));

  // ---------- Chiếu sáng ----------
  const cs = wb.addWorksheet("Chiếu sáng");
  const smartN = q.lightLines.filter((l) => l.smart).reduce((a, l) => a + l.qty, 0), plainN = q.lightLines.filter((l) => !l.smart).reduce((a, l) => a + l.qty, 0);
  const lightTitle = !plainN ? "Smart Lighting – Đèn thông minh FPT" : !smartN ? "Chiếu sáng – đèn LED THƯỜNG thương hiệu AB" : "Chiếu sáng – đèn thông minh FPT + đèn LED thường AB";
  header(cs, smartN ? "BÁO GIÁ CHIẾU SÁNG" : "BÁO GIÁ CHIẾU SÁNG – ĐÈN LED THƯỜNG", 6);
  hrow(cs, 8, ["STT", "Thiết bị", "ĐVT", "SL", "Đơn giá (đ)", "Thành tiền (đ)"]);
  r = 9;
  q.lightLines.forEach((l, k) => {
    const br = p.extras?.[`light_${l.code}`] != null || l.proposed ? undefined : rowOf[l.code === (s.defaultSpotlight ?? "spotlight_ab") ? "spotlight" : "downlight"];
    cs.getRow(r).values = [k + 1, l.name, l.unit, br && q.lightLines.length === 1 ? { formula: `'Bóc tách'!D${br}` } : l.qty, l.price, { formula: `D${r}*E${r}` }];
    cs.getCell(r, 5).font = font({ color: BLUE }); [5, 6].forEach((c) => (cs.getCell(r, c).numFmt = NUM)); r++;
  });
  const lEnd = Math.max(9, r - 1); r++;
  const L: Record<string, number> = {};
  for (const [k, label, v] of [["inst", "Tỷ lệ lắp đặt", s.lightInstall], ["disc", "Tỷ lệ chiết khấu thiết bị", s.lightDiscount]] as const) {
    L[k] = r; cs.getCell(r, 2).value = label; cs.getCell(r, 6).value = v; cs.getCell(r, 6).numFmt = "0%"; cs.getCell(r, 6).font = font({ color: BLUE }); r++;
  }
  for (const [k, label, f] of [["tot", "TỔNG GIÁ TRỊ THIẾT BỊ", `SUM(F9:F${lEnd})`], ["ld", "CHI PHÍ LẮP ĐẶT", ""], ["ck", "CHIẾT KHẤU", ""], ["sum", "TỔNG CỘNG", ""]] as const) {
    L[k] = r; cs.getCell(r, 2).value = label; cs.getCell(r, 2).font = font({ bold: true }); if (f) cs.getCell(r, 6).value = { formula: f }; r++;
  }
  cs.getCell(L.ld, 6).value = { formula: `ROUND(F${L.tot}*F${L.inst},0)` };
  cs.getCell(L.ck, 6).value = { formula: `-ROUND(F${L.tot}*F${L.disc},0)` };
  cs.getCell(L.sum, 6).value = { formula: `F${L.tot}+F${L.ld}+F${L.ck}` };
  ["tot", "ld", "ck", "sum"].forEach((k) => { cs.getCell(L[k], 6).numFmt = NUM; cs.getCell(L[k], 6).font = font({ bold: true }); });
  r++;
  cs.getCell(r, 1).value = `Ghi chú: chưa bao gồm ${boq.excluded.filter((x) => !/Ổ|Tủ|Wifi|RJ45|TV|Bình/.test(x.name)).map((x) => `${x.name} ${x.qty}${x.unit === "m" ? "m" : ""}`).join(", ")}.`;
  cs.mergeCells(r, 1, r, 6); cs.getCell(r, 1).font = font({ italic: true, size: 9 }); cs.getCell(r, 1).alignment = { wrapText: true };
  if (plainN) {
    r++;
    cs.getCell(r, 1).value = `Lưu ý loại đèn: ${plainN} bộ đèn AB là đèn LED THƯỜNG (không thông minh) – bật/tắt theo mạch qua công tắc cảm ứng FPT, không chỉnh độ sáng/màu từng đèn.` + (q.upgrade.qty ? ` Nâng cấp ${q.upgrade.qty} bộ lên đèn thông minh FPT Athena: thêm khoảng ${q.upgrade.extra.toLocaleString("vi-VN")}đ (sau chiết khấu).` : "");
    cs.mergeCells(r, 1, r, 6); cs.getCell(r, 1).font = font({ bold: true, size: 9, color: "FF92400E" }); cs.getCell(r, 1).alignment = { wrapText: true }; cs.getRow(r).height = 30;
  }
  [6, 46, 7, 8, 16, 18].forEach((w, k) => (cs.getColumn(k + 1).width = w));

  // ---------- Tổng hợp (first) ----------
  header(th, "BẢNG TỔNG HỢP BÁO GIÁ GIẢI PHÁP NHÀ THÔNG MINH", 6);
  hrow(th, 8, ["STT", "Hạng mục", "Thiết bị niêm yết (đ)", "Giảm giá (đ)", "Lắp đặt (đ)", "Tổng cộng (đ)"]);
  th.getRow(9).values = [1, "Smart Home FPT", { formula: `'Smart Home'!H${T.niem}` }, { formula: `'Smart Home'!H${T.giam}` }, { formula: `'Smart Home'!H${T.ld}` }, { formula: `'Smart Home'!H${T.tong}` }];
  th.getRow(10).values = [2, lightTitle, { formula: `'Chiếu sáng'!F${L.tot}` }, { formula: `'Chiếu sáng'!F${L.ck}` }, { formula: `'Chiếu sáng'!F${L.ld}` }, { formula: `'Chiếu sáng'!F${L.sum}` }];
  th.getRow(11).values = ["", "TỔNG CỘNG", { formula: "SUM(C9:C10)" }, { formula: "SUM(D9:D10)" }, { formula: "SUM(E9:E10)" }, { formula: "SUM(F9:F10)" }];
  for (let rr = 9; rr <= 11; rr++) for (let c = 1; c <= 6; c++) { const cell = th.getCell(rr, c); cell.border = border; cell.numFmt = NUM; cell.font = font({ bold: rr === 11, color: c >= 3 && rr < 11 ? GREEN : undefined }); }
  th.getCell(13, 1).value = `Bằng chữ: ${q.grandWords}`; th.mergeCells(13, 1, 13, 6); th.getCell(13, 1).font = font({ italic: true });
  [6, 50, 20, 18, 16, 20].forEach((w, k) => (th.getColumn(k + 1).width = w));
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Technical BOQ for the site electrician (FR-017): every device by floor/room, incl. items outside the quote. */
export async function buildTechBoq(p: Project, boq: BOQResult): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const { DEVICE_LABEL } = await import("../core/types");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("BOQ kỹ thuật");
  ws.addRow([`BOQ KỸ THUẬT – ${p.customer} – ${p.address}`]).font = { bold: true, size: 13, name: "Arial" };
  ws.addRow([`Nguồn bản vẽ: ${p.sourceName || "-"} · Ngày: ${p.date} · Lập bởi STC CROP (bóc tách tự động + duyệt kỹ sư)`]);
  ws.addRow([]);
  const h = ws.addRow(["Tầng", "Phòng / vị trí", "Thiết bị", "SL", "Số mạch (Line)", "Ghi chú"]);
  h.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Arial" };
  h.eachCell((c) => (c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } }));
  const groups = new Map<string, { floor: string; room: string; type: string; qty: number; circuits: Set<string>; notes: Set<string> }>();
  for (const d of p.detections) {
    if (d.status === "removed") continue;
    const floor = d.floor || p.pages.find((x) => x.index === d.page)?.floor || "Tầng 1";
    const k = `${floor}|${d.room || "?"}|${d.type}`;
    const g = groups.get(k) ?? { floor, room: d.room || "?", type: d.type, qty: 0, circuits: new Set<string>(), notes: new Set<string>() };
    g.qty++; if (d.circuits) g.circuits.add(d.circuits); if (d.note) g.notes.add(d.note); groups.set(k, g);
  }
  [...groups.values()].sort((a, b) => (a.floor + a.room).localeCompare(b.floor + b.room, "vi")).forEach((g) =>
    ws.addRow([g.floor, g.room, DEVICE_LABEL[g.type as keyof typeof DEVICE_LABEL] ?? g.type, g.qty, [...g.circuits].join(" | "), [...g.notes].join("; ")]));
  ws.addRow([]);
  ws.addRow(["", "TỔNG HỢP"]).font = { bold: true };
  boq.lines.filter((l) => l.qty > 0).forEach((l) => ws.addRow(["", l.name + (l.estimated ? " (ước tính)" : ""), l.unit, l.qty]));
  [12, 30, 30, 8, 26, 40].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
