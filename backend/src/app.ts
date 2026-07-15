import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { exerciseMediaRouter } from "./routes/exerciseMedia.js";
import { wellnessRouter } from "./routes/wellness.js";
import { exercisesRouter } from "./routes/exercises.js";

export const app = express();

const allowedOrigins = config.APP_ORIGIN.split(",").map((origin) => origin.trim());

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.get("/ready", async (_request, response) => {
  try {
    await pool.query("SELECT 1");
    response.json({ status: "ready" });
  } catch {
    response.status(503).json({ status: "unavailable" });
  }
});

app.use("/api/exercise-media", exerciseMediaRouter);
app.use("/api/auth", authRouter);
app.use("/api/wellness", wellnessRouter);
app.use("/api/exercises", exercisesRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);
