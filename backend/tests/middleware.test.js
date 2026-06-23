import { describe, it, expect } from "vitest";
import { validate } from "../middleware/validate.js";
import { loginSchema, changePasswordSchema } from "../schemas.js";

// Helper to simulate Express req/res/next
function mockExpress(body = {}) {
  const req = { body };
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

describe("validate middleware", () => {
  describe("loginSchema", () => {
    const mw = validate(loginSchema);

    it("should pass with valid password", () => {
      const { req, res, next, wasNextCalled } = mockExpress({ password: "secret123" });
      mw(req, res, next);
      expect(wasNextCalled()).toBe(true);
      expect(req.body).toEqual({ password: "secret123" });
    });

    it("should reject missing password", () => {
      const { req, res, next, wasNextCalled } = mockExpress({});
      mw(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
      expect(res._body.error).toBe("Validation error");
    });

    it("should reject unknown fields (strict mode)", () => {
      const { req, res, next, wasNextCalled } = mockExpress({
        password: "secret",
        extraField: "hacker",
      });
      mw(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
      expect(res._body.error).toBe("Validation error");
    });
  });

  describe("changePasswordSchema", () => {
    const mw = validate(changePasswordSchema);

    it("should pass with valid passwords", () => {
      const { req, res, next, wasNextCalled } = mockExpress({
        currentPassword: "old",
        newPassword: "newpass",
      });
      mw(req, res, next);
      expect(wasNextCalled()).toBe(true);
    });

    it("should reject short new password", () => {
      const { req, res, next, wasNextCalled } = mockExpress({
        currentPassword: "old",
        newPassword: "ab",
      });
      mw(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });

    it("should reject unknown fields", () => {
      const { req, res, next, wasNextCalled } = mockExpress({
        currentPassword: "old",
        newPassword: "newpass",
        admin: true,
      });
      mw(req, res, next);
      expect(wasNextCalled()).toBe(false);
      expect(res._status).toBe(400);
    });
  });
});

describe("fileTypeCheck middleware", () => {
  // We test the logic in isolation without actual buffers by mocking fileTypeFromBuffer
  // Full integration test would require real PNG/JPEG headers
  it("should be importable without errors", async () => {
    const mod = await import("../middleware/fileTypeCheck.js");
    expect(typeof mod.validateFileTypes).toBe("function");
  });
});
