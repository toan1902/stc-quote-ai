"use client";
import type { CatalogItem, Project, Settings } from "../core/types";
import { DEFAULT_CATALOG, DEFAULT_SETTINGS } from "../core/catalog";

const safe = <T,>(fn: () => T, fb: T): T => { try { return fn(); } catch { return fb; } };

export const loadCatalog = (): CatalogItem[] => safe(() => {
  const saved = JSON.parse(localStorage.getItem("stc_catalog") || "null") as CatalogItem[] | null;
  if (!saved) return DEFAULT_CATALOG;
  return DEFAULT_CATALOG.map((d) => ({ ...d, ...(saved.find((s) => s.code === d.code) ?? {}) }));
}, DEFAULT_CATALOG);
export const saveCatalog = (c: CatalogItem[]) => safe(() => localStorage.setItem("stc_catalog", JSON.stringify(c.map(({ code, price, discount }) => ({ code, price, discount })))), undefined);

export const loadSettings = (): Settings => safe(() => ({ ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("stc_settings") || "{}") }), DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => safe(() => localStorage.setItem("stc_settings", JSON.stringify(s)), undefined);

export const saveDraft = (p: Project) => safe(() => localStorage.setItem("stc_draft", JSON.stringify(p)), undefined);
export const loadDraft = (): Project | null => safe(() => JSON.parse(localStorage.getItem("stc_draft") || "null"), null);
export const clearDraft = () => safe(() => localStorage.removeItem("stc_draft"), undefined);

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
