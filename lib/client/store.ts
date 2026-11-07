"use client";
import type { CatalogItem, Project, Settings } from "../core/types";
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from "../core/catalog";

const safe = <T,>(fn: () => T, fb: T): T => { try { return fn(); } catch { return fb; } };

/** Bump when default prices change; codes listed for a revision drop any price saved on this machine before it. */
const CATALOG_REV = 2;
const REPRICED: Record<number, string[]> = { 2: ["ir", "curtain_motor", "gate_sw"] }; // theo bảng bán lẻ FPT 07/11/2026
export const loadCatalog = (): CatalogItem[] => safe(() => {
  let saved = JSON.parse(localStorage.getItem("stc_catalog") || "null") as CatalogItem[] | null;
  if (!saved) return DEFAULT_CATALOG;
  const rev = Number(localStorage.getItem("stc_catalog_rev") || 1);
  if (rev < CATALOG_REV) {
    const drop = new Set(Object.entries(REPRICED).filter(([r]) => Number(r) > rev).flatMap(([, c]) => c));
    saved = saved.filter((x) => !drop.has(x.code));
    localStorage.setItem("stc_catalog", JSON.stringify(saved)); localStorage.setItem("stc_catalog_rev", String(CATALOG_REV));
  }
  return DEFAULT_CATALOG.map((d) => ({ ...d, ...(saved.find((s) => s.code === d.code) ?? {}) }));
}, DEFAULT_CATALOG);
export const saveCatalog = (c: CatalogItem[]) => safe(() => (localStorage.setItem("stc_catalog_rev", String(CATALOG_REV)), localStorage.setItem("stc_catalog", JSON.stringify(c.map(({ code, price, discount, salePrice }) => ({ code, price, discount, salePrice }))))), undefined);

export const loadSettings = (): Settings => safe(() => ({ ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("stc_settings") || "{}") }), DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => safe(() => localStorage.setItem("stc_settings", JSON.stringify(s)), undefined);

/** Hồ sơ khách hàng lưu trên trình duyệt này (mỗi khách 1 hồ sơ, khoá theo id). */
const PKEY = "stc_projects";
const readAll = (): Record<string, Project> => safe(() => {
  const all = JSON.parse(localStorage.getItem(PKEY) || "{}") as Record<string, Project>;
  const old = JSON.parse(localStorage.getItem("stc_draft") || "null") as Project | null; // bản nháp kiểu cũ → chuyển vào danh sách
  if (old?.id && !all[old.id]) { all[old.id] = old; localStorage.setItem(PKEY, JSON.stringify(all)); }
  if (old) localStorage.removeItem("stc_draft");
  return all;
}, {});
export const listProjects = (): Project[] => Object.values(readAll()).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
export const getProject = (id: string): Project | null => readAll()[id] ?? null;
/** Returns false when the browser storage is full. */
export const saveProject = (p: Project): boolean => {
  try { const all = readAll(); all[p.id] = { ...p, updatedAt: new Date().toISOString() }; localStorage.setItem(PKEY, JSON.stringify(all)); return true; }
  catch { return false; }
};
export const deleteProject = (id: string) => safe(() => { const all = readAll(); delete all[id]; localStorage.setItem(PKEY, JSON.stringify(all)); }, undefined);

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Sao lưu toàn bộ dữ liệu trên máy này: hồ sơ khách + bảng giá + cài đặt (1 file). */
export interface Backup { type: "stc-quote-backup"; version: 1; at: string; projects: Project[]; catalog: unknown; catalogRev: string | null; settings: unknown }
export const makeBackup = (): Backup => ({
  type: "stc-quote-backup", version: 1, at: new Date().toISOString(), projects: listProjects(),
  catalog: safe(() => JSON.parse(localStorage.getItem("stc_catalog") || "null"), null), catalogRev: safe(() => localStorage.getItem("stc_catalog_rev"), null),
  settings: safe(() => JSON.parse(localStorage.getItem("stc_settings") || "null"), null),
});
/** Khôi phục: gộp hồ sơ (giữ bản sửa mới hơn), bảng giá & cài đặt chỉ ghi khi máy này chưa có hoặc withPrices. */
export function restoreBackup(b: Backup, withPrices: boolean): { added: number; updated: number; kept: number } {
  if (b?.type !== "stc-quote-backup" || !Array.isArray(b.projects)) throw new Error("Không phải file sao lưu STC Quote AI");
  const all = readAll(); let added = 0, updated = 0, kept = 0;
  for (const p of b.projects) {
    if (!p?.id) continue;
    const cur = all[p.id];
    if (!cur) { all[p.id] = p; added++; } else if ((p.updatedAt || "") > (cur.updatedAt || "")) { all[p.id] = p; updated++; } else kept++;
  }
  localStorage.setItem(PKEY, JSON.stringify(all));
  if (b.catalog && (withPrices || !localStorage.getItem("stc_catalog"))) { localStorage.setItem("stc_catalog", JSON.stringify(b.catalog)); if (b.catalogRev) localStorage.setItem("stc_catalog_rev", b.catalogRev); }
  if (b.settings && (withPrices || !localStorage.getItem("stc_settings"))) localStorage.setItem("stc_settings", JSON.stringify(b.settings));
  return { added, updated, kept };
}
