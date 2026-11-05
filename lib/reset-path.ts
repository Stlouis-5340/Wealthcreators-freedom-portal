/** Public reset routes. Kept free of Node and Prisma so proxy.ts can import it. */
export function isPublicResetPath(pathname: string): boolean {
  return (
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/")
  );
}
