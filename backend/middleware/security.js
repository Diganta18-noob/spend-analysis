import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// ─── Helmet ─────────────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: false, // CSP is frontend's responsibility
  crossOriginEmbedderPolicy: false, // Allow Gemini images in responses
});

// ─── CORS ───────────────────────────────────────────────────────────
export function createCorsMiddleware() {
  const raw = process.env.CORS_ORIGINS || "";
  if (!raw || raw === "*") {
    return cors({ exposedHeaders: ["X-Refreshed-Token"] }); // Wide-open, same as before but exposes token
  }
  const allowList = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return cors({
    origin(origin, cb) {
      // Allow server-to-server (no origin) and allow-listed origins
      if (!origin || allowList.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    exposedHeaders: ["X-Refreshed-Token"],
  });
}

// ─── Admin rate limiter ─────────────────────────────────────────────
export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests. Try again in a minute." },
  keyGenerator: (req) =>
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown",
});

// ─── Login rate limiter (5 attempts / 15 min) ────────────────────────
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again in 15 minutes." },
  keyGenerator: (req) =>
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown",
});
