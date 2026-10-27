/** Runtime env read. A static `process.env.NAME` access can be inlined at build time. */
export function readServerEnv(name: string): string {
  return (process.env[name] ?? "").trim();
}
