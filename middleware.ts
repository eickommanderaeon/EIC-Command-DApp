// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.pathname;
  if (!url.startsWith("/admin")) return;

  const user = process.env.BASIC_AUTH_USER || "";
  const pass = process.env.BASIC_AUTH_PASS || "";
  if (!user || !pass) return NextResponse.next(); // no auth set => allow (dev)

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) {
    return new NextResponse("Auth required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="secure"' } });
  }
  const decoded = Buffer.from(auth.split(" ")[1] || "", "base64").toString();
  const [u, p] = decoded.split(":");
  if (u === user && p === pass) return NextResponse.next();

  return new NextResponse("Forbidden", { status: 403 });
}

export const config = {
  matcher: ["/admin/:path*"],
};

