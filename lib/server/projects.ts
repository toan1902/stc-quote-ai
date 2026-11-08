import "server-only";
import { get, list, put } from "@vercel/blob";

/** Hồ sơ khách đồng bộ giữa các máy (chỉ nhân viên đăng nhập). Chỉ số liệu bóc tách – KHÔNG có bản vẽ. */
export interface StoredProject { id: string; updatedAt?: string; deleted?: boolean; [k: string]: unknown }
export interface StoredConfig { updatedAt: string; catalog: unknown; catalogRev: string | null; settings: unknown }

const ACCESS = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";
const PREFIX = "projects/";
export const validProjectId = (id: string) => /^[A-Za-z0-9_-]{3,64}$/.test(id);

async function readJson<T>(pathname: string): Promise<T | null> {
  const r = await get(pathname, { access: ACCESS, useCache: false }).catch(() => null);
  if (!r || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text()) as T;
}
const writeJson = (pathname: string, v: unknown) =>
  put(pathname, JSON.stringify(v), { access: ACCESS, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60 });

export async function listStored(): Promise<StoredProject[]> {
  const names: string[] = []; let cursor: string | undefined;
  do {
    const r = await list({ prefix: PREFIX, cursor, limit: 1000 });
    names.push(...r.blobs.map((b) => b.pathname).filter((p) => p.endsWith(".json")));
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  const out: StoredProject[] = [];
  for (let i = 0; i < names.length; i += 10) {
    const part = await Promise.all(names.slice(i, i + 10).map((n) => readJson<StoredProject>(n).catch(() => null)));
    out.push(...part.filter((x): x is StoredProject => !!x?.id));
  }
  return out;
}

export const readStored = (id: string) => readJson<StoredProject>(`${PREFIX}${id}.json`);

/** Ghi khi bản gửi lên mới hơn bản trên server. Trả về bản đang được giữ. */
export async function upsertStored(p: StoredProject): Promise<{ kept: StoredProject; written: boolean }> {
  const cur = await readStored(p.id);
  if (cur && (cur.updatedAt || "") >= (p.updatedAt || "")) return { kept: cur, written: false };
  await writeJson(`${PREFIX}${p.id}.json`, p);
  return { kept: p, written: true };
}

export const readConfig = () => readJson<StoredConfig>("config/app.json");
export async function upsertConfig(c: StoredConfig) {
  const cur = await readConfig();
  if (cur && cur.updatedAt >= c.updatedAt) return { kept: cur, written: false };
  await writeJson("config/app.json", c);
  return { kept: c, written: true };
}
