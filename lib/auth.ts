// HMAC-signed session cookie (Web Crypto → works in middleware/edge and node).
export const COOKIE = "stc_auth";
const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function makeToken(): Promise<string> {
  const exp = Date.now() + 30 * 24 * 3600 * 1000;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyToken(tok?: string): Promise<boolean> {
  if (!tok) return false;
  const [exp, sig] = tok.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return (await hmac(exp)) === sig;
}
