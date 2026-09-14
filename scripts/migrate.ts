import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const files = (await readdir(resolve("db/migrations"))).filter(file => file.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(await readFile(resolve("db/migrations", file), "utf8"));
  }
  console.log("Workspace database migration complete.");
} finally {
  await pool.end();
}
