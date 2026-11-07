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
