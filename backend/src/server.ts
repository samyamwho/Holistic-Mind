import { app } from "./app.js";
import { config } from "./config.js";
import { ensureSchema, pool } from "./db.js";

async function start() {
  if (config.AUTO_MIGRATE) {
    await ensureSchema();
  }

  const server = app.listen(config.PORT, () => {
    console.log(`Holistic Mind API listening on ${config.API_BASE_URL}`);
  });

  const shutdown = () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch(async (error) => {
  console.error("Unable to start API", error);
  await pool.end();
  process.exit(1);
});
