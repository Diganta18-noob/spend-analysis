import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { requireAdmin } from "../middleware/auth.js";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_change_me_123";

function mockExpress(token) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const res = {
    _status: 200,
    _headers: {},
    _body: null,
    status(code) { this._status = code; return this; },
    json(data) { this._body = data; return this; },
    setHeader(name, value) { this._headers[name] = value; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, wasNextCalled: () => nextCalled };
}

describe("requireAdmin middleware", () => {
  it("should pass with valid token and set req.admin", () => {
    const payload = { username: "admin" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "30m" });
    const { req, res, next, wasNextCalled } = mockExpress(token);

    requireAdmin(req, res, next);

    expect(wasNextCalled()).toBe(true);
    expect(req.admin).toBeDefined();
    expect(req.admin.username).toBe("admin");
    expect(res._headers["X-Refreshed-Token"]).toBeDefined();
  });

  it("should reject missing token", () => {
    const { req, res, next, wasNextCalled } = mockExpress(null);

    requireAdmin(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe("Unauthorized");
  });

  it("should reject malformed token", () => {
    const { req, res, next, wasNextCalled } = mockExpress("not.a.token");

    requireAdmin(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe("Invalid or expired token");
  });

  it("should reject expired token", () => {
    const payload = { username: "admin" };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "-1s" });
    const { req, res, next, wasNextCalled } = mockExpress(token);

    requireAdmin(req, res, next);

    expect(wasNextCalled()).toBe(false);
    expect(res._status).toBe(401);
    expect(res._body.error).toBe("Invalid or expired token");
  });
});
