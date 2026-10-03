import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { pool } from "./db.js";
import { authRouter } from "./routes/auth.js";
import { exerciseMediaRouter } from "./routes/exerciseMedia.js";
import { journalRouter } from "./routes/journal.js";
import { wellnessRouter } from "./routes/wellness.js";
import { exercisesRouter } from "./routes/exercises.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { exerciseAudioRouter } from "./routes/exerciseAudio.js";
import { libraryRouter } from "./routes/library.js";

export const app = express();

const allowedOrigins = config.APP_ORIGIN.split(",").map((origin) => origin.trim());

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  })
);
// The journal accepts device-encrypted text and up to 4 MB of encrypted media.
app.use("/api/wellness/journal", express.json({ limit: "18mb" }), journalRouter);
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
app.use("/api/exercise-audio", exerciseAudioRouter);
app.use("/api/auth", authRouter);
app.use("/api/wellness", wellnessRouter);
app.use("/api/exercises", exercisesRouter);
app.use("/api/library", libraryRouter);
app.use("/api/recommendations", recommendationsRouter);

app.use((_request, response) => {
  response.status(404).json({ error: "Not found" });
});

const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (request.path.startsWith("/api/wellness/journal")) {
    // Parser/database errors can contain request bodies or legacy text. Never log them.
    const status = error?.type === "entity.too.large" ? 413 : error?.type === "entity.parse.failed" ? 400 : 500;
    if (status === 500) console.error("Journal request failed.", {
      method: request.method,
      path: request.path,
      code: typeof error?.code === "string" ? error.code : undefined,
    });
    response.status(status).json({ error: status === 413 ? "Journal request is too large." : "Journal request could not be completed." });
    return;
  }
  console.error(error);
  response.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);
