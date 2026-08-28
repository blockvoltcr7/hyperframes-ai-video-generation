import { describe, expect, it } from "vitest";
import { buildImageRequest, validateAssetPlan } from "./generate-image-assets.mjs";

const validPlan = {
  version: 1,
  style_prompt: "Editorial technical illustration with crisp silhouettes and a controlled blue palette",
  assets: [{
    id: "agent-chip",
    role: "cutout",
    prompt: "An abstract accelerator chip with three luminous paths converging through its center",
    output: "assets/generated/agent-chip.png",
    size: "1024x1024",
    background: "opaque",
    quality: "medium",
  }],
};

describe("image asset planning", () => {
  it("builds a GPT Image request with the shared style and no-text guard", () => {
    const [asset] = validateAssetPlan(validPlan);
    const request = buildImageRequest(validPlan, asset);

    expect(request.model).toBe("gpt-image-2");
    expect(request.output_format).toBe("png");
    expect(request.prompt).toContain(validPlan.style_prompt);
    expect(request.prompt).toContain("No words, letters, logos");
  });

  it("rejects outputs outside the generated asset directory", () => {
    const invalid = structuredClone(validPlan);
    invalid.assets[0].output = "../../secrets.png";

    expect(() => validateAssetPlan(invalid)).toThrow(/assets\/generated/);
  });

  it("requires alpha-capable formats for transparent assets", () => {
    const invalid = structuredClone(validPlan);
    invalid.assets[0].output = "assets/generated/agent-chip.jpg";
    invalid.assets[0].background = "transparent";

    expect(() => validateAssetPlan(invalid)).toThrow(/PNG or WebP/);
  });

  it("rejects transparent requests for GPT Image 2", () => {
    const transparent = structuredClone(validPlan);
    transparent.assets[0].background = "transparent";
    const [asset] = validateAssetPlan(transparent);

    expect(() => buildImageRequest(transparent, asset)).toThrow(/does not provide transparent output/);
  });
});
