import { describe, expect, it } from "vitest";
import { parseTopic, readArgs } from "./codex-create-short.mjs";

describe("Codex short launcher", () => {
  it("extracts duration without leaking it into the project slug", () => {
    expect(parseTopic("How agent memory works duration 45 seconds")).toEqual({
      topic: "How agent memory works",
      slug: "how-agent-memory-works",
      duration: 45,
    });
  });

  it("uses a bounded default and rejects unsafe durations", () => {
    expect(parseTopic("Vector search explained").duration).toBe(30);
    expect(() => parseTopic("Vector search in 5 seconds")).toThrow(/outside the supported/);
    expect(() => parseTopic("Vector search in 301 seconds")).toThrow(/outside the supported/);
  });

  it("rejects malformed flag pairs", () => {
    expect(() => readArgs(["--topic"])).toThrow(/Usage/);
    expect(readArgs(["--workflow", "adaptive", "--topic", "Agents"]).get("topic")).toBe("Agents");
  });
});
