import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const prismaBin = path.join(root, "node_modules/prisma/build/index.js");
const modelMarker = "/// Portal account";

function modelBlock(file) {
  const text = fs.readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");
  const index = text.indexOf(modelMarker);
  if (index < 0) {
    console.error(`${file} is missing the shared model block.`);
    process.exit(1);
  }
  return text.slice(index).trim();
}

const sqliteModels = modelBlock("prisma/schema.prisma");
const postgresModels = modelBlock("prisma/postgres/schema.prisma");
if (sqliteModels !== postgresModels) {
  console.error(
    "prisma/schema.prisma and prisma/postgres/schema.prisma models differ. Keep every model below the Portal account comment identical.",
  );
  process.exit(1);
}

function readEnvFile(file, into) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return;
  for (const raw of fs.readFileSync(full, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const cleaned = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = cleaned.indexOf("=");
    if (eq <= 0) continue;
    const key = cleaned.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = cleaned.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    into[key] = value;
  }
}

const preexisting = new Set(
  Object.keys(process.env).filter((key) => process.env[key] !== undefined && process.env[key] !== ""),
);
const fileEnv = {};
readEnvFile(".env", fileEnv);
readEnvFile(".env.local", fileEnv);
for (const [key, value] of Object.entries(fileEnv)) {
  if (!preexisting.has(key)) process.env[key] = value;
}

function isPostgres(url) {
  return typeof url === "string" && /^postgres(ql)?:\/\//i.test(url);
}

function prisma(args) {
  const result = spawnSync(process.execPath, [prismaBin, ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const task = process.argv[2];
const databaseUrl = process.env.DATABASE_URL ?? "";
const postgres = isPostgres(databaseUrl);

if (process.env.VERCEL === "1" && !postgres) {
  console.error(
    "This Vercel build needs DATABASE_URL set to a postgresql:// connection string. SQLite files do not persist on serverless.",
  );
  process.exit(1);
}

if (task === "migrate" || task === "seed") {
  if (!postgres) {
    console.error(`${task} against Postgres needs DATABASE_URL to start with postgresql://.`);
    process.exit(1);
  }
} else if (task) {
  console.error("Use no argument, migrate, or seed.");
  process.exit(1);
} else if (databaseUrl && !postgres && !databaseUrl.startsWith("file:")) {
  console.error("DATABASE_URL must be a SQLite file: URL or a postgresql:// URL.");
  process.exit(1);
}

if (postgres) {
  if (!process.env.DIRECT_URL) process.env.DIRECT_URL = databaseUrl;
  prisma(["generate", "--schema", "prisma/postgres/schema.prisma"]);
  if (task !== "seed") {
    prisma(["migrate", "deploy", "--schema", "prisma/postgres/schema.prisma"]);
  }
  if (task === "seed") {
    prisma(["db", "seed", "--schema", "prisma/postgres/schema.prisma"]);
    console.log("Demo users are in Postgres. Before local SQLite dev, run: npx prisma generate");
  }
} else {
  prisma(["generate", "--schema", "prisma/schema.prisma"]);
}
