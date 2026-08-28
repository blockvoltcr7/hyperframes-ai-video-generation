import { describe, expect, it } from "vitest";
import { buildCodexImagePrompt } from "./codex-image-generate.mjs";

describe("Codex image generation adapter", () => {
  it("requires the built-in image tool and forbids code substitutes", () => {
    const prompt = buildCodexImagePrompt("A blue accelerator chip on navy, no text");

    expect(prompt).toContain("built-in image generation tool");
    expect(prompt).toContain("Do not substitute SVG, HTML, canvas, Python");
    expect(prompt).toContain("A blue accelerator chip on navy, no text");
  });
});
