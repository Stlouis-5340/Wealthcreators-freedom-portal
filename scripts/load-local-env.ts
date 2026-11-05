import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readEnvFile(file: string, into: Record<string, string>): void {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = cleaned.indexOf("=");
    if (eq <= 0) continue;
    const key = cleaned.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = cleaned.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    into[key] = value;
  }
}

const preexisting = new Set(
  Object.keys(process.env).filter((key) => process.env[key] !== undefined && process.env[key] !== ""),
);
const fileEnv: Record<string, string> = {};
readEnvFile(path.join(root, ".env"), fileEnv);
readEnvFile(path.join(root, ".env.local"), fileEnv);
for (const [key, value] of Object.entries(fileEnv)) {
  if (!preexisting.has(key)) process.env[key] = value;
}
