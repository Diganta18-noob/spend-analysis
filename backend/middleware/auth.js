import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_me_123";

/**
 * Middleware that verifies a JWT in the Authorization header.
 * Exposes decoded data in req.admin.
 * Automatically generates a refreshed token and adds it to res header ("refresh on activity").
 */
export function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;

    // Refresh on activity: generate a new token with fresh 30m TTL
    const refreshedToken = jwt.sign(
      { username: decoded.username },
      JWT_SECRET,
      { expiresIn: "30m" }
    );
    res.setHeader("X-Refreshed-Token", refreshedToken);

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
