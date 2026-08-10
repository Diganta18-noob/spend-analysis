import { describe, it, expect } from "vitest";
import { cn } from "@/lib/cn";

describe("toolchain", () => {
  it("runs in a jsdom environment", () => {
    expect(typeof document).toBe("object");
    expect(document.createElement("div")).toBeTruthy();
  });

  it("resolves the @ alias and merges class names", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    const show = false as boolean;
    expect(cn("text-sm", show && "hidden", "font-medium")).toBe("text-sm font-medium");
  });
});
