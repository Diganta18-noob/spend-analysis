import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config.js";
import { requireAdmin, requireUserAuth } from "./auth.js";

export async function requireAnalysisAccess(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer "))
    return res.status(401).json({ error: "Unauthorized" });
  const token = header.slice(7);
  // Unverified header chooses a verifier, never grants access.
  const algorithm = jwt.decode(token, { complete: true })?.header?.alg;
  if (algorithm === "HS256") {
    try {
      const decoded = jwt.verify(token, getJwtSecret(), {
        algorithms: ["HS256"],
      });
      if (decoded.username !== "admin") throw new Error();
      return requireAdmin(req, res, () => {
        req.analysisAccess = { kind: "admin" };
        next();
      });
    } catch {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  }
  return requireUserAuth(req, res, () => {
    req.analysisAccess = { kind: "owner", ownerId: req.user.id };
    next();
  });
}
