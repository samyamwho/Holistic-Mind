import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { config } from "../config.js";

function keysMatch(providedKey: string, expectedKey: string) {
  const provided = Buffer.from(providedKey);
  const expected = Buffer.from(expectedKey);

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export const requireAdmin: RequestHandler = (request, response, next) => {
  const providedKey = request.header("x-admin-key") ?? "";

  if (!keysMatch(providedKey, config.ADMIN_API_KEY)) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
};
