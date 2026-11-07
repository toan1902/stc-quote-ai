import type { CrossCheck, Detection, Project } from "./types.ts";
import { active } from "./merge.ts";
import { parseCircuits } from "./circuits.ts";

const LIGHT_LOADS = new Set(["downlight", "spotlight", "panel_light", "ceiling_light", "chandelier", "wall_light", "tube_light", "led_strip", "exhaust_fan", "ceiling_fan"]);

/** Discipline cross-checks C1–C6 (research R7). */
export function crossCheck(p: Project): CrossCheck[] {
  const dets = active(p.detections);
  const out: CrossCheck[] = [];
  const disc = (d: Detection) => p.pages.find((x) => x.index === d.page)?.discipline;
  const key = (d: Detection, c: string) => `${d.floor || p.pages.find((x) => x.index === d.page)?.floor || ""}#${c}`;

  // C1 – circuits: loads vs switches
  const sw = dets.filter((d) => d.type === "switch");
  const loads = dets.filter((d) => LIGHT_LOADS.has(d.type) && (disc(d) === "lighting" || !disc(d)));
  const swC = new Map<string, Detection[]>(), ldC = new Map<string, Detection[]>();
  sw.forEach((d) => parseCircuits(d.circuits).forEach((c) => swC.set(key(d, c), [...(swC.get(key(d, c)) || []), d])));
  loads.forEach((d) => parseCircuits(d.circuits).forEach((c) => ldC.set(key(d, c), [...(ldC.get(key(d, c)) || []), d])));
  for (const [k, ds] of swC) if (!ldC.has(k)) {
    const c = k.split("#")[1];
    out.push({ code: "C1", severity: "warn", message: `Line ${c} (${ds[0].room ?? "?"}): công tắc có nút nhưng bản vẽ không thể hiện tải – xác nhận với chủ nhà (nút dự phòng/quạt trần/đèn trang trí).`, detectionIds: ds.map((d) => d.id) });
  }
  if (sw.length) for (const [k, ds] of ldC) if (!swC.has(k)) {
    const c = k.split("#")[1];
    out.push({ code: "C1", severity: "warn", message: `Line ${c}: có ${ds.length} thiết bị chiếu sáng nhưng không tìm thấy công tắc điều khiển.`, detectionIds: ds.map((d) => d.id) });
  }
  const noCircuitLoads = loads.filter((d) => !d.proposed && !parseCircuits(d.circuits).length);
  if (sw.length && noCircuitLoads.length) out.push({ code: "C1", severity: "info", message: `${noCircuitLoads.length} đèn chưa đọc được số mạch – kiểm tra lại trên bản vẽ.`, detectionIds: noCircuitLoads.map((d) => d.id) });

  // C2 – switch without circuits
  const swNo = sw.filter((d) => !parseCircuits(d.circuits).length);
  if (swNo.length) out.push({ code: "C2", severity: "error", message: `${swNo.length} công tắc chưa đọc được số mạch → không xác định được số nút.`, detectionIds: swNo.map((d) => d.id) });

  // C3 – cameras LV vs camera sockets on power plan
  const cams = dets.filter((d) => d.type === "camera_indoor" || d.type === "camera_outdoor");
  const camSockets = dets.filter((d) => (d.type === "socket" || d.type === "socket_wp") && /camera|cam/i.test(d.note || ""));
  if (camSockets.length && cams.length !== camSockets.length)
    out.push({ code: "C3", severity: "warn", message: `Số camera bản vẽ điện nhẹ (${cams.length}) khác số ổ cắm camera bản vẽ cấp nguồn (${camSockets.length}).`, detectionIds: [...cams, ...camSockets].map((d) => d.id) });

  // C4 – AC units vs panel circuits
  const acs = dets.filter((d) => d.type === "ac_indoor");
  const acN = acs.length || p.acUnits || 0;
  if (p.panelAcCircuits != null && p.panelAcCircuits !== acN)
    out.push({ code: "C4", severity: "warn", message: `Số dàn lạnh (${acN}) khác số mạch điều hòa trên sơ đồ tủ điện (${p.panelAcCircuits}).`, detectionIds: acs.map((d) => d.id) });

  // C5 – near-duplicates
  const seen: Detection[] = [];
  for (const d of dets) {
    const dup = seen.find((e) => e.page === d.page && e.type === d.type && d.x >= 0 && Math.hypot(e.x - d.x, e.y - d.y) < 0.006);
    if (dup && d.type !== "switch") out.push({ code: "C5", severity: "warn", message: `Có thể đếm trùng ${d.type} tại trang ${d.page} (${d.room ?? "?"}).`, detectionIds: [dup.id, d.id] });
    seen.push(d);
  }

  // C6 – duplicated discipline+floor sheets
  const seenPg = new Map<string, number>();
  for (const pg of p.pages) {
    if (!["lighting", "power", "low_voltage", "hvac"].includes(pg.discipline)) continue;
    const k = `${pg.discipline}|${pg.floor}`;
    if (seenPg.has(k)) out.push({ code: "C6", severity: "warn", message: `Trang ${seenPg.get(k)} và ${pg.index} cùng là ${pg.discipline} ${pg.floor} – kiểm tra tránh cộng trùng (mặt bằng mái/chi tiết?).`, detectionIds: [] });
    else seenPg.set(k, pg.index);
  }
  return out;
}
