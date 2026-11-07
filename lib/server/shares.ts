import "server-only";
import { get, put } from "@vercel/blob";
import type { PrintPayload } from "@/components/QuoteEditor";

/** A shared quote. Only quote figures are stored — never the customer's drawing (constitution: no drawings server-side). */
export interface Deposit { amount: number; date: string; method: string; phone?: string; note?: string; by?: string }
export interface ShareRecord {
  id: string;
  version: number;
  status: "live" | "locked";
  payload: PrintPayload;              // without drawings
  createdAt: string; updatedAt: string;
  deposit?: Deposit;
  lockedAt?: string;
  contractNo?: string;
}

const ACCESS = (process.env.BLOB_ACCESS === "public" ? "public" : "private") as "public" | "private";
const path = (id: string) => `quotes/${id}.json`;
export const storageReady = () => !!process.env.BLOB_READ_WRITE_TOKEN;
export const validId = (id: string) => /^[A-Za-z0-9]{12,32}$/.test(id);

export function newShareId() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const b = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(b, (x) => a[x % a.length]).join("");
}

export async function readShare(id: string): Promise<ShareRecord | null> {
  if (!validId(id) || !storageReady()) return null;
  const r = await get(path(id), { access: ACCESS, useCache: false }).catch(() => null);
  if (!r || !r.stream) return null;
  return JSON.parse(await new Response(r.stream).text()) as ShareRecord;
}

export async function writeShare(rec: ShareRecord) {
  await put(path(rec.id), JSON.stringify(rec), {
    access: ACCESS, addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 60,
  });
}

export function stripDrawings(p: PrintPayload): PrintPayload {
  const { drawings: _d, ...rest } = p; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

export const contractNoFor = (id: string, d = new Date()) =>
  `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${id.slice(0, 4).toUpperCase()}/HĐ-STC`;

export const summary = (r: ShareRecord) => ({ id: r.id, version: r.version, status: r.status, updatedAt: r.updatedAt, deposit: r.deposit, lockedAt: r.lockedAt, contractNo: r.contractNo });
export type ShareSummary = ReturnType<typeof summary>;
