import "server-only";
import { get, put } from "@vercel/blob";

/** Lượt khách mở link báo giá (không tính nhân viên đã đăng nhập). */
export interface ViewLog { count: number; first?: string; last?: string; recent: { t: string; dev: string; page?: string }[] }
const ACCESS = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";
const path = (id: string) => `views/${id}.json`;

export async function readViews(id: string): Promise<ViewLog> {
  const r = await get(path(id), { access: ACCESS, useCache: false }).catch(() => null);
  if (!r || !r.stream) return { count: 0, recent: [] };
  return JSON.parse(await new Response(r.stream).text()) as ViewLog;
}

export function deviceOf(ua: string) {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Máy tính Windows" : /Macintosh/.test(ua) ? "Máy Mac" : "Thiết bị khác";
  const app = /Zalo/i.test(ua) ? " (Zalo)" : /FBAN|FBAV|FB_IAB/.test(ua) ? " (Facebook)" : "";
  return os + app;
}

export async function addView(id: string, dev: string, page?: string) {
  const v = await readViews(id); const t = new Date().toISOString();
  const last = v.recent[0];
  // cùng thiết bị mở lại trong 10 phút → chỉ cập nhật giờ, không tính thêm lượt
  if (last && last.dev === dev && Date.now() - Date.parse(last.t) < 10 * 60_000) { last.t = t; v.last = t; }
  else { v.count++; v.first ??= t; v.last = t; v.recent.unshift({ t, dev, page }); v.recent = v.recent.slice(0, 30); }
  await put(path(id), JSON.stringify(v), { access: ACCESS, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });
  return v;
}
