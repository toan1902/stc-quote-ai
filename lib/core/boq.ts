import type { BOQLine, Detection, DeviceType, Discipline, Project, Settings } from "./types.ts";
import { DEVICE_LABEL } from "./types.ts";
import { active } from "./merge.ts";
import { parseCircuits, splitGangs } from "./circuits.ts";

export interface SwitchPos {
  room: string; gangs: number; circuits: string[]; twoWay: boolean; page: number; ids: string[]; floor: string; note?: string; estimated?: boolean;
}
export interface BOQResult {
  lines: BOQLine[];
  switches: SwitchPos[];
  cameras: Detection[];
  curtains: { room: string; floor: string; meters: number; estimated: boolean; ids: string[] }[];
  acRooms: string[];
  acFloors: string[];
  lightsByRoom: { room: string; floor: string; qty: number; type: DeviceType; proposed?: boolean }[];
  /** STC-proposed extra fixtures (Detection.proposed), grouped by page for the proposal drawing */
  proposals: { page: number; floor: string; ids: string[]; byRoom: { room: string; qty: number }[] }[];
  floors: string[];
  hubs: number;
  ledStripM: number;
  excluded: { name: string; qty: number; unit: string }[];
}

const LIGHT_SCOPE: Partial<Record<DeviceType, "lighting" | "excluded">> = {
  downlight: "lighting", spotlight: "lighting",
  panel_light: "excluded", ceiling_light: "excluded", chandelier: "excluded", wall_light: "excluded",
  tube_light: "excluded", led_strip: "excluded", exhaust_fan: "excluded", ceiling_fan: "excluded",
};

function discOf(p: Project, page: number): Discipline | undefined {
  return p.pages.find((x) => x.index === page)?.discipline;
}
function floorOf(p: Project, d: Detection): string {
  return d.floor || p.pages.find((x) => x.index === d.page)?.floor || "Tầng 1";
}

/** Keep detections from the authoritative discipline when such pages exist (avoid cross-sheet double count). */
function from(p: Project, dets: Detection[], types: DeviceType[], disc: Discipline): Detection[] {
  const ofType = dets.filter((d) => types.includes(d.type));
  const hasDisc = ofType.some((d) => discOf(p, d.page) === disc);
  return hasDisc ? ofType.filter((d) => discOf(p, d.page) === disc) : ofType;
}

function line(code: string, name: string, unit: string, ds: Detection[], scope: BOQLine["scope"], qty?: number, estimated = false): BOQLine {
  return { code, name, unit, qty: qty ?? ds.length, rooms: [...new Set(ds.map((d) => d.room || "?"))], detectionIds: ds.map((d) => d.id), estimated, scope };
}

export function buildBOQ(p: Project, s: Settings): BOQResult {
  const dets = active(p.detections);
  const lines: BOQLine[] = [];

  // ---- Floors & hubs
  const floorSet = new Set<string>();
  p.pages.filter((x) => ["lighting", "power"].includes(x.discipline)).forEach((x) => floorSet.add(x.floor || "Tầng 1"));
  dets.forEach((d) => floorSet.add(floorOf(p, d)));
  const floors = [...floorSet].sort();
  // 1 bộ trung tâm cho nhà 1 tầng, 2 bộ cho nhà nhiều tầng (hoặc theo diện tích nếu có); 1 bộ mở rộng sóng ZigBee
  const hubs = Math.max(1, Math.min(2, floors.length), p.areaM2 ? Math.ceil(p.areaM2 / s.areaPerHubM2) : 1);

  // ---- Switches (authoritative: lighting plan)
  const sws = from(p, dets, ["switch"], "lighting");
  const used = new Set<string>();
  const switches: SwitchPos[] = [];
  const mergeEps = 0.012;
  for (const d of sws) {
    if (used.has(d.id)) continue;
    used.add(d.id);
    const group = [d];
    if (s.mergeAdjacentSwitches && d.x >= 0 && d.y >= 0 && !d.gangs) {
      for (const e of sws) {
        if (used.has(e.id) || e.page !== d.page || e.x < 0 || e.y < 0 || e.gangs) continue;
        const total = new Set([...group.flatMap((g) => parseCircuits(g.circuits)), ...parseCircuits(e.circuits)]).size;
        if (Math.hypot(e.x - d.x, e.y - d.y) < mergeEps && total <= 4) { group.push(e); used.add(e.id); }
      }
    }
    const circuits = [...new Set(group.flatMap((g) => parseCircuits(g.circuits)))];
    const n = Math.max(1, circuits.length || group.reduce((a, g) => a + (g.gangs ?? 0), 0));
    for (const g of splitGangs(n)) {
      switches.push({ room: d.room || "?", gangs: g, circuits, twoWay: group.some((x) => x.twoWay), page: d.page, ids: group.map((x) => x.id), floor: floorOf(p, d), note: group.map((x) => x.note).filter(Boolean).join("; ") || undefined, estimated: !circuits.length });
    }
  }
  for (const g of [1, 2, 3, 4]) {
    const list = switches.filter((x) => x.gangs === g);
    lines.push({ code: `sw${g}`, name: `Công tắc ${g} nút`, unit: "Vị trí", qty: list.length, rooms: [...new Set(list.map((x) => x.room))], detectionIds: list.flatMap((x) => x.ids), estimated: false, scope: "smarthome" });
  }

  // ---- Lighting fixtures (authoritative: lighting plan)
  const lightTypes = Object.keys(LIGHT_SCOPE) as DeviceType[];
  const proposed = dets.filter((d) => d.proposed && LIGHT_SCOPE[d.type] === "lighting");
  const lights = from(p, dets.filter((d) => !d.proposed), lightTypes, "lighting");
  const lightsByRoomMap = new Map<string, { room: string; floor: string; qty: number; type: DeviceType; proposed?: boolean }>();
  for (const t of lightTypes) {
    const ds = lights.filter((d) => d.type === t);
    if (!ds.length) continue;
    if (t === "led_strip") continue; // handled as metres below
    lines.push(line(t, DEVICE_LABEL[t], t === "exhaust_fan" || t === "ceiling_fan" ? "Cái" : "Bộ", ds, LIGHT_SCOPE[t]!));
    if (LIGHT_SCOPE[t] === "lighting") for (const d of ds) {
      const k = `${floorOf(p, d)}|${d.room || "?"}|${t}`;
      const cur = lightsByRoomMap.get(k) ?? { room: d.room || "?", floor: floorOf(p, d), qty: 0, type: t };
      cur.qty++; lightsByRoomMap.set(k, cur);
    }
  }
  if (proposed.length) {
    lines.push(line("spotlight_prop", "Spotlight đề xuất thêm", "Bộ", proposed, "lighting"));
    for (const d of proposed) {
      const k = `${floorOf(p, d)}|${d.room || "?"}|prop`;
      const cur = lightsByRoomMap.get(k) ?? { room: d.room || "?", floor: floorOf(p, d), qty: 0, type: "spotlight" as DeviceType, proposed: true };
      cur.qty++; lightsByRoomMap.set(k, cur);
    }
  }
  const proposals = [...new Set(proposed.map((d) => d.page))].map((pg) => {
    const ds = proposed.filter((d) => d.page === pg);
    const rooms = new Map<string, number>(); ds.forEach((d) => rooms.set(d.room || "?", (rooms.get(d.room || "?") ?? 0) + 1));
    return { page: pg, floor: floorOf(p, ds[0]), ids: ds.map((d) => d.id), byRoom: [...rooms].map(([room, qty]) => ({ room, qty })) };
  });
  const ledEst = p.estimates.filter((e) => e.key.startsWith("led_strip"));
  const ledStripM = ledEst.reduce((a, e) => a + e.meters, 0);
  const ledDets = lights.filter((d) => d.type === "led_strip");
  if (ledStripM > 0 || ledDets.length) lines.push({ ...line("led_strip", "LED dây 12V", "m", ledDets, "excluded", Math.round(ledStripM)), estimated: true });

  // ---- Curtains (power plan junction boxes marked rèm, or explicit curtain_point)
  const curtainDets = dets.filter((d) => d.type === "curtain_point" || (d.type === "junction_box" && /rèm|rem|curtain/i.test(d.note || "")));
  const seenCur: Detection[] = [];
  for (const d of curtainDets) if (!seenCur.some((e) => e.room === d.room && Math.hypot(e.x - d.x, e.y - d.y) < 0.02 && e.page !== d.page)) seenCur.push(d);
  const curtains = seenCur.map((d) => {
    const est = p.estimates.find((e) => e.key === `rail:${d.room}`);
    return { room: d.room || "?", floor: floorOf(p, d), meters: est?.meters ?? s.railPerCurtainM, estimated: true, ids: [d.id] };
  });
  lines.push(line("curtain_sw", "Công tắc rèm", "Bộ", seenCur, "smarthome"));
  lines.push(line("curtain_motor", "Động cơ rèm", "Bộ", seenCur, "smarthome"));
  lines.push({ ...line("rail", "Ray rèm", "mét", seenCur, "smarthome", curtains.reduce((a, c) => a + c.meters, 0)), estimated: true });

  // ---- Cameras (authoritative: low-voltage plan)
  const cameras = from(p, dets, ["camera_indoor", "camera_outdoor"], "low_voltage");
  lines.push(line("cam_out", "Camera ngoài trời", "Cái", cameras.filter((d) => d.type === "camera_outdoor"), "smarthome"));
  lines.push(line("cam_in", "Camera trong nhà", "Cái", cameras.filter((d) => d.type === "camera_indoor"), "smarthome"));

  // ---- AC → IR (authoritative: HVAC plan)
  const acs = from(p, dets, ["ac_indoor"], "hvac");
  const acQty = acs.length || p.acUnits || 0;
  lines.push(line("ir", "Bộ IR điều hòa", "Bộ", acs, "smarthome", acQty));
  const acRooms = acs.length ? acs.map((d) => d.room || "?") : Array.from({ length: acQty }, (_, i) => `Điều hòa ${i + 1}`);
  const acFloors = acs.length ? acs.map((d) => floorOf(p, d)) : acRooms.map(() => floors[0] || "Tầng 1");

  lines.push({ code: "hub", name: "Bộ trung tâm T950", unit: "Bộ", qty: hubs, rooms: [], detectionIds: [], estimated: false, scope: "smarthome" });
  lines.push({ code: "zigbee", name: "Mở rộng sóng ZigBee", unit: "Bộ", qty: 1, rooms: [], detectionIds: [], estimated: false, scope: "smarthome" });

  // ---- Excluded / reference items
  const exTypes: DeviceType[] = ["socket", "socket_wp", "floor_socket", "data_outlet", "tv_outlet", "wifi_ap", "water_heater", "db_panel"];
  for (const t of exTypes) {
    const ds = dets.filter((d) => d.type === t);
    if (ds.length) lines.push(line(t, DEVICE_LABEL[t], "Cái", ds, "excluded"));
  }
  const excluded = lines.filter((l) => l.scope === "excluded" && l.qty > 0).map((l) => ({ name: l.name, qty: l.qty, unit: l.unit }));

  return { lines, switches, cameras, curtains, acRooms, acFloors, lightsByRoom: [...lightsByRoomMap.values()], proposals, floors, hubs, ledStripM, excluded };
}

export const qtyOf = (r: BOQResult, code: string) => r.lines.find((l) => l.code === code)?.qty ?? 0;

/** Export gate (Constitution IV / FR-012): only after the review screen has been opened. */
export const canExport = (p: Pick<Project, "status">) => p.status === "reviewed" || p.status === "exported";
