"use client";
import type { Project } from "../core/types";
import { onLocalChange, rawProjects, readLocalConfig, readTombs, writeLocalConfig, writeRawProjects, writeTombs, type LocalConfig } from "./store";

/** Đồng bộ hồ sơ khách + bảng giá giữa các máy qua /api/projects. Bản sửa mới hơn thắng. */
export type SyncState = { status: "idle" | "syncing" | "ok" | "error" | "off"; at?: string; msg?: string };
type Remote = Project & { deleted?: boolean };

let state: SyncState = { status: "idle" };
const subs = new Set<(s: SyncState) => void>();
const set = (s: SyncState) => { state = s; subs.forEach((f) => f(s)); };
export const subscribeSync = (f: (s: SyncState) => void) => { subs.add(f); f(state); return () => { subs.delete(f); }; };

let running: Promise<boolean> | null = null;
let again = false;

/** Kéo về + gửi lên. Trả về true nếu danh sách trên máy này thay đổi. */
export function syncNow(): Promise<boolean> {
  if (running) { again = true; return running; }
  running = (async () => {
    let changed = false;
    try {
      do { again = false; changed = (await once()) || changed; } while (again);
      set({ status: "ok", at: new Date().toISOString() });
    } catch (e) {
      const m = (e as Error).message;
      set(m === "off" ? { status: "off", msg: "Chưa bật kho lưu trữ" } : { status: "error", msg: m });
    } finally { running = null; }
    return changed;
  })();
  set({ ...state, status: "syncing" });
  return running;
}

async function once(): Promise<boolean> {
  const r = await fetch("/api/projects", { cache: "no-store" });
  if (r.status === 503) throw new Error("off");
  if (r.status === 401) throw new Error("Hết phiên đăng nhập – đăng nhập lại");
  if (!r.ok) throw new Error(`Lỗi ${r.status}`);
  const { projects: remote, config } = (await r.json()) as { projects: Remote[]; config: LocalConfig | null };

  const all = rawProjects(); const tombs = readTombs(); let changed = false;
  const rmap = new Map(remote.map((p) => [p.id, p]));
  // 1) kéo về
  for (const rp of remote) {
    const lp = all[rp.id]; const lAt = lp?.updatedAt || tombs[rp.id] || "";
    if ((rp.updatedAt || "") <= lAt) continue;
    if (rp.deleted) { if (lp) { delete all[rp.id]; changed = true; } delete tombs[rp.id]; }
    else { const { deleted: _d, ...p } = rp; all[rp.id] = p as Project; delete tombs[rp.id]; changed = true; } // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  if (changed) writeRawProjects(all);
  // 2) gửi lên phần mới hơn
  const up: Remote[] = [];
  for (const lp of Object.values(all)) { const rp = rmap.get(lp.id); if (!rp || (lp.updatedAt || "") > (rp.updatedAt || "")) up.push(lp); }
  for (const [id, at] of Object.entries(tombs)) { const rp = rmap.get(id); if (rp && !rp.deleted && at > (rp.updatedAt || "")) up.push({ id, deleted: true, updatedAt: at } as Remote); else if (!rp || rp.deleted) delete tombs[id]; }
  writeTombs(tombs);
  const lc = readLocalConfig();
  if (config && (!lc || config.updatedAt > lc.updatedAt)) { writeLocalConfig(config); changed = true; }
  const sendCfg = lc && (!config || lc.updatedAt > config.updatedAt) ? lc : undefined;
  if (up.length || sendCfg) {
    for (let i = 0; i < Math.max(up.length, 1); i += 20) {
      const res = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ projects: up.slice(i, i + 20), config: i === 0 ? sendCfg : undefined }) });
      if (!res.ok) throw new Error(`Lỗi gửi lên ${res.status}`);
      const j = (await res.json()) as { projects: Remote[] };
      for (const t of up.slice(i, i + 20)) if (t.deleted) delete tombs[t.id];
      // server có bản mới hơn (máy khác vừa sửa) → lấy bản đó
      for (const k of j.projects) { const lp = all[k.id]; if (!k.deleted && lp && (k.updatedAt || "") > (lp.updatedAt || "")) { all[k.id] = k; changed = true; } }
    }
    writeTombs(tombs); if (changed) writeRawProjects(all);
  }
  return changed;
}

/** Tự gửi lên ~2 giây sau mỗi thay đổi; tự kéo về khi quay lại tab. */
let started = false;
export function startAutoSync(onPulled: () => void) {
  if (started || typeof window === "undefined") return () => {};
  started = true;
  let t: ReturnType<typeof setTimeout> | null = null;
  const run = () => syncNow().then((c) => { if (c) onPulled(); });
  const off = onLocalChange(() => { if (t) clearTimeout(t); t = setTimeout(run, 2000); });
  const vis = () => { if (document.visibilityState === "visible") run(); };
  document.addEventListener("visibilitychange", vis);
  window.addEventListener("online", run);
  run();
  return () => { started = false; off(); document.removeEventListener("visibilitychange", vis); window.removeEventListener("online", run); };
}
