import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

const DARK_TOKENS: Record<string, string> = {
  "--bg": "#08090D",
  "--surface": "#0D1017",
  "--surface-2": "#121621",
  "--elevated": "#171B24",
  "--border": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(255, 255, 255, 0.14)",
  "--text": "#F5F7FA",
  "--text-2": "#9AA3B2",
  "--text-muted": "#697386",
  "--accent": "#E3B341",
  "--success": "#20C997",
  "--danger": "#FF6B6B",
  "--info": "#5B9CFF",
};

const LIGHT_TOKENS: Record<string, string> = {
  "--bg": "#FBFBFA",
  "--surface": "#FFFFFF",
  "--surface-2": "#F5F6F8",
  "--elevated": "#FFFFFF",
  "--border": "rgba(9, 11, 15, 0.10)",
  "--border-strong": "rgba(9, 11, 15, 0.18)",
  "--text": "#0B0D12",
  "--text-2": "#4B5565",
  "--text-muted": "#6F7A8B",
  "--accent": "#A9761B",
  "--success": "#0E8A63",
  "--danger": "#C4362F",
  "--info": "#2563C9",
};

/** Extract the body of a top-level block whose selector matches. */
function block(selector: string): string {
  const start = css.indexOf(selector + " {");
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unterminated block: ${selector}`);
}

describe("design tokens", () => {
  let root: string;
  let light: string;

  beforeAll(() => {
    root = block(":root");
    light = block(".light-mode");
  });

  it.each(Object.entries(DARK_TOKENS))("defines %s in dark mode as %s", (name, value) => {
    expect(root).toContain(`${name}: ${value};`);
  });

  it.each(Object.entries(LIGHT_TOKENS))("overrides %s in light mode as %s", (name, value) => {
    expect(light).toContain(`${name}: ${value};`);
  });

  it("defines all 14 category ramp steps in both modes", () => {
    for (let i = 0; i < 14; i++) {
      expect(root).toContain(`--ramp-${i}:`);
      expect(light).toContain(`--ramp-${i}:`);
    }
  });

  it("applies tabular numerals globally", () => {
    expect(css).toContain("font-variant-numeric: tabular-nums");
  });

  it("no longer imports fonts from Google", () => {
    expect(css).not.toContain("fonts.googleapis.com");
  });
});
