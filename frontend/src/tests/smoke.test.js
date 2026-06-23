import { describe, it, expect } from "vitest";

describe("frontend smoke test", () => {
  it("should pass a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
