import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const sql = await readFile(resolve("db/migrations/001_workspace.sql"), "utf8");
  await pool.query(sql);
  console.log("Workspace database migration complete.");
} finally {
  await pool.end();
}
