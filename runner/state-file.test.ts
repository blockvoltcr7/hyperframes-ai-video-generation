import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createJsonStateFile } from "./state-file.js";

describe("json state file", () => {
  it("serializes overlapping writes so concurrent temp files never collide", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-state-"));
    const filePath = path.join(dir, "state", "jobs.json");
    const errors: unknown[] = [];
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const state = createJsonStateFile<number[]>(filePath, { onError: (error) => errors.push(error) });
      let value = 0;
      for (let round = 0; round < 50; round += 1) {
        // Mirrors the runner: a fire-and-forget write immediately followed by an awaited one.
        value += 1;
        void state.write(() => [value]);
        value += 1;
        await state.write(() => [value]);
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(errors).toEqual([]);
      expect(unhandled).toEqual([]);
      expect(await state.read()).toEqual([100]);
      expect((await fs.readdir(path.dirname(filePath))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("reports write failures through onError instead of rejecting", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-state-"));
    const blocker = path.join(dir, "blocked");
    await fs.writeFile(blocker, "not a directory");
    const errors: unknown[] = [];
    const state = createJsonStateFile<string>(path.join(blocker, "jobs.json"), { onError: (error) => errors.push(error) });
    await expect(state.write(() => "value")).resolves.toBeUndefined();
    expect(errors).toHaveLength(1);
  });

  it("returns undefined for a missing or corrupt file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-state-"));
    const filePath = path.join(dir, "jobs.json");
    const state = createJsonStateFile<string[]>(filePath);
    expect(await state.read()).toBeUndefined();
    await fs.writeFile(filePath, "{not json");
    expect(await state.read()).toBeUndefined();
    await state.write(() => ["ok"]);
    expect(await state.read()).toEqual(["ok"]);
  });
});
