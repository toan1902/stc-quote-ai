import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "./lib/auth";

export async function middleware(req: NextRequest) {
  const ok = await verifyToken(req.cookies.get(COOKIE)?.value);
  if (ok) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = req.nextUrl.clone(); url.pathname = "/login"; url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!login|api/login|api/health|q/|_next|quote-assets|pdf.worker|favicon).*)"] };
