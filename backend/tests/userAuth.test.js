import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { requireUserAuth, optionalUserAuth } from "../middleware/auth.js";
import { upsertUser } from "../db.js";

// Mock the db.js file
vi.mock("../db.js", () => {
  return {
    upsertUser: vi.fn(async (id, email) => ({ id, email })),
    getUserAnalyses: vi.fn(async (ownerId) => [{ id: "test-1", bank: "HDFC" }]),
    getUserStats: vi.fn(async (ownerId) => ({ total_analyses: 1 })),
  };
});

function mockExpress(token) {
  const req = {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(data) { this._body = data; return this; },
  };
  let nextCalled = false;
  const next = () => { nextCalled = true; };
  return { req, res, next, wasNextCalled: () => nextCalled };
}

describe("user auth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireUserAuth", () => {
    it("should reject missing token with 401", async () => {
      const { req, res, next, wasNextCalled } = mockExpress(null);
      await requireUserAuth(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(401);
    });

    it("should pass with valid token in test environment", async () => {
      const payload = { sub: "test-user-123", email: "test@example.com" };
      const token = jwt.sign(payload, "secret");
      const { req, res, next, wasNextCalled } = mockExpress(token);

      await requireUserAuth(req, res, next);

      expect(wasNextCalled()).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe("test-user-123");
      expect(req.user.email).toBe("test@example.com");
      expect(upsertUser).toHaveBeenCalledWith("test-user-123", "test@example.com");
    });
  });

  describe("optionalUserAuth", () => {
    it("should pass silently with null user if token is missing", async () => {
      const { req, res, next, wasNextCalled } = mockExpress(null);
      await optionalUserAuth(req, res, next);
      expect(wasNextCalled()).toBe(true);
      expect(req.user).toBeNull();
    });

    it("should populate req.user if token is present", async () => {
      const payload = { sub: "test-user-123", email: "test@example.com" };
      const token = jwt.sign(payload, "secret");
      const { req, res, next, wasNextCalled } = mockExpress(token);

      await optionalUserAuth(req, res, next);

      expect(wasNextCalled()).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe("test-user-123");
      expect(upsertUser).toHaveBeenCalledWith("test-user-123", "test@example.com");
    });
  });
});
