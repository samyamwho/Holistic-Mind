import { ensureSchema, pool } from "../db.js";

try {
  await ensureSchema();
  console.log("Database schema is ready.");
} finally {
  await pool.end();
}
