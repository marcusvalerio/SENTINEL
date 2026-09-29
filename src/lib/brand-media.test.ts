import { describe, expect, it } from "vitest";
import { shouldPlayAmbient } from "./brand-media";

const ok = { reducedMotion: false, saveData: false, effectiveType: "4g", viewportWidth: 1440 };

describe("shouldPlayAmbient", () => {
  it("plays on a capable desktop connection", () => {
    expect(shouldPlayAmbient(ok)).toBe(true);
    expect(shouldPlayAmbient({ ...ok, effectiveType: undefined })).toBe(true);
  });

  it("never plays with reduced motion or data saver", () => {
    expect(shouldPlayAmbient({ ...ok, reducedMotion: true })).toBe(false);
    expect(shouldPlayAmbient({ ...ok, saveData: true })).toBe(false);
  });

  it("falls back on slow connections and narrow screens", () => {
    expect(shouldPlayAmbient({ ...ok, effectiveType: "3g" })).toBe(false);
    expect(shouldPlayAmbient({ ...ok, viewportWidth: 390 })).toBe(false);
  });
});
