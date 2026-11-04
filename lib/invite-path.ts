/** Public accept route. Kept free of Node and Prisma so proxy.ts can import it. */
export function isPublicInvitePath(pathname: string): boolean {
  return pathname === "/invite" || pathname.startsWith("/invite/");
}
