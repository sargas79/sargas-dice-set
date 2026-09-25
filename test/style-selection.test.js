import { describe, it, expect } from "vitest";
import { isStyleEnabled, enabledStyles, resolveStyle } from "../src/foundry/style-selection.js";

const styles = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("style flags", () => {
  it("treats missing flags as enabled", () => {
    expect(isStyleEnabled({}, "a")).toBe(true);
    expect(isStyleEnabled(undefined, "a")).toBe(true);
    expect(isStyleEnabled({ a: false }, "a")).toBe(false);
  });

  it("lists only enabled styles", () => {
    expect(enabledStyles(styles, { b: false }).map(s => s.id)).toEqual(["a", "c"]);
  });

  it("uses the requested style when enabled", () => {
    expect(resolveStyle("b", styles, {})).toEqual({ style: styles[1], fallback: false });
  });

  it("falls back to the first enabled style when the choice is turned off", () => {
    expect(resolveStyle("a", styles, { a: false })).toEqual({ style: styles[1], fallback: true });
  });

  it("uses the first enabled style when nothing was chosen, without a fallback warning", () => {
    expect(resolveStyle(null, styles, { a: false })).toEqual({ style: styles[1], fallback: false });
  });

  it("returns no style when every style is off", () => {
    expect(resolveStyle("a", styles, { a: false, b: false, c: false })).toEqual({ style: null, fallback: false });
  });
});
