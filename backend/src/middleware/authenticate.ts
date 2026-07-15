import type { RequestHandler } from "express";
import { verifyAccessToken } from "../auth/tokens.js";

export const authenticate: RequestHandler = async (request, response, next) => {
  const authorization = request.header("authorization");
  const [scheme, accessToken] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !accessToken) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    response.locals.userId = await verifyAccessToken(accessToken);
    next();
  } catch {
    response.status(401).json({ error: "Session expired" });
  }
};
