import { NextResponse } from "next/server";
import { auth, isPortalRole } from "@/auth";
import { homeForRole } from "@/lib/demo-accounts";

const publicPaths = new Set(["/login", "/signup"]);

function isGuidePath(pathname: string): boolean {
  return pathname === "/guide" || pathname.startsWith("/guide/");
}

function isMemberPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/goals" ||
    pathname.startsWith("/goals/") ||
    pathname === "/assets" ||
    pathname.startsWith("/assets/") ||
    pathname === "/spending" ||
    pathname.startsWith("/spending/") ||
    pathname === "/milestones" ||
    pathname.startsWith("/milestones/")
  );
}

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const signedIn = isPortalRole(role);

  if (!signedIn) {
    if (publicPaths.has(pathname)) return NextResponse.next();
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  const home = homeForRole(role);
  if (publicPaths.has(pathname)) {
    const destination = req.nextUrl.clone();
    destination.pathname = home;
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  if (role === "member" && isGuidePath(pathname)) {
    const destination = req.nextUrl.clone();
    destination.pathname = "/";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  if (role === "guide" && isMemberPath(pathname)) {
    const destination = req.nextUrl.clone();
    destination.pathname = "/guide";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
