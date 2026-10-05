import jwt from "jsonwebtoken";

import { getJwtSecret } from '../config.js';

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
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (decoded.username !== 'admin') throw new Error('Invalid admin identity');
    req.admin = decoded;

    // Refresh on activity: generate a new token with fresh 30m TTL
    const refreshedToken = jwt.sign(
      { username: decoded.username },
      getJwtSecret(),
      { expiresIn: "30m" }
    );
    res.setHeader("X-Refreshed-Token", refreshedToken);

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Middleware that requires a verified user token (Clerk JWT).
 * Decodes the user ID and email and upserts user in DB.
 */
import { upsertUser } from "../db.js";

export async function requireUserAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing user token" });
  }

  const token = authHeader.split(" ")[1];
  const clerkPublicKey = process.env.CLERK_JWT_KEY;

  if (!clerkPublicKey) {
    if (process.env.NODE_ENV === "test") {
      try {
        const decoded = jwt.decode(token);
        if (!decoded) throw new Error();
        req.user = {
          id: decoded.sub || decoded.id || "test-user-id",
          email: decoded.email || "test@example.com"
        };
        await upsertUser(req.user.id, req.user.email);
        return next();
      } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
    return res.status(500).json({ error: "Authentication configuration error: CLERK_JWT_KEY is missing" });
  }

  try {
    let publicKey = clerkPublicKey;
    if (!publicKey.includes("-----BEGIN PUBLIC KEY-----")) {
      publicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }
    publicKey = publicKey.replace(/\\n/g, "\n");

    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    if (!decoded.sub) throw new Error('Missing user identity');
    const email = decoded.email || decoded.email_address || "";

    req.user = {
      id: decoded.sub,
      email: email
    };

    await upsertUser(req.user.id, req.user.email);
    next();
  } catch (err) {
    console.error("Clerk JWT verification failed:", err.message);
    return res.status(401).json({ error: "Invalid or expired user session" });
  }
}

/**
 * Optional user authentication middleware.
 * If token is valid, req.user is set. If missing or invalid, proceeds as anonymous.
 */
export async function optionalUserAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) { req.user = null; return next(); }
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Invalid authorization header' });

  const token = authHeader.split(" ")[1];
  const clerkPublicKey = process.env.CLERK_JWT_KEY;

  if (!clerkPublicKey) {
    if (process.env.NODE_ENV === "test") {
      try {
        const decoded = jwt.decode(token);
        if (decoded && (decoded.sub || decoded.id)) {
          req.user = {
            id: decoded.sub || decoded.id || "test-user-id",
            email: decoded.email || "test@example.com"
          };
          await upsertUser(req.user.id, req.user.email);
        }
        if (!req.user) return res.status(401).json({ error: 'Invalid user token' });
        return next();
      } catch (err) {
        // Ignore decoding errors for optional auth
      }
    }
    return res.status(500).json({ error: 'User authentication is not configured' });
  }

  try {
    let publicKey = clerkPublicKey;
    if (!publicKey.includes("-----BEGIN PUBLIC KEY-----")) {
      publicKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    }
    publicKey = publicKey.replace(/\\n/g, "\n");

    const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
    const email = decoded.email || decoded.email_address || "";

    if (!decoded.sub) throw new Error('Missing user identity');
    req.user = {
      id: decoded.sub,
      email: email
    };

    await upsertUser(req.user.id, req.user.email);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired user session' });
  }
  next();
}

