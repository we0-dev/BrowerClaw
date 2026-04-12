import { describe, expect, it } from "vitest";
import { mergeBrowserPreviewGuidance } from "./browser-preview-guidance.js";

describe("mergeBrowserPreviewGuidance", () => {
  it("appends guidance when absent", () => {
    const out = mergeBrowserPreviewGuidance("Client hint.");
    expect(out).toContain("Client hint.");
    expect(out).toContain("Browser preview routing (model judgment):");
    expect(out).toContain("Do not rely on any external keyword classifier");
  });

  it("returns only guidance when existing is empty", () => {
    const out = mergeBrowserPreviewGuidance(undefined);
    expect(out.startsWith("Browser preview routing (model judgment):")).toBe(true);
  });

  it("does not duplicate the guidance block", () => {
    const once = mergeBrowserPreviewGuidance("A");
    const twice = mergeBrowserPreviewGuidance(once);
    expect(twice).toBe(once);
  });
});
