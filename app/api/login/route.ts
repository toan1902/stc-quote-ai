import { NextResponse } from "next/server";
import { COOKIE, makeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.APP_PASSWORD;
  if (!expected || password !== expected) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await makeToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 24 * 3600 });
  return res;
}
