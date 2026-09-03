import fs from "node:fs/promises";
import path from "node:path";

export interface JsonStateFile<T> {
  /** Queue an atomic write of `snapshot()`. Never rejects; failures go to `onError`. */
  write(snapshot: () => T): Promise<void>;
  /** Read the persisted value, or `undefined` when the file is missing or not valid JSON. */
  read(): Promise<T | undefined>;
}

/**
 * Atomic JSON persistence for a single file whose writers may overlap.
 *
 * Writes are serialized and each uses a unique temp file, so two in-flight writes can no
 * longer rename the same temp path (which raised ENOENT from whichever finished second).
 * The snapshot is taken when the write actually starts, so queued writes always persist the
 * latest state. Failures are reported instead of rejecting because callers persist from
 * process event handlers where an unhandled rejection would take the runner down.
 */
export function createJsonStateFile<T>(filePath: string, options: { onError?: (error: unknown) => void } = {}): JsonStateFile<T> {
  const onError = options.onError ?? ((error: unknown) => {
    console.error(`[studio-runner] could not persist ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`);
  });
  let chain: Promise<void> = Promise.resolve();
  let sequence = 0;

  async function writeOnce(snapshot: () => T): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.${process.pid}.${++sequence}.tmp`;
    try {
      await fs.writeFile(temp, `${JSON.stringify(snapshot(), null, 2)}\n`);
      await fs.rename(temp, filePath);
    } catch (error) {
      await fs.rm(temp, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  return {
    write(snapshot) {
      chain = chain.then(() => writeOnce(snapshot)).catch((error: unknown) => { onError(error); });
      return chain;
    },
    async read() {
      try {
        return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
      } catch {
        return undefined;
      }
    },
  };
}
