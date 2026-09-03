import { describe, expect, it } from "vitest";
import { parseRunnerResponse } from "./api";

function response(status: number, body: string) {
  return { ok: status >= 200 && status < 300, status, text: async () => body };
}

describe("runner response parsing", () => {
  it("returns the JSON payload for successful responses", async () => {
    await expect(parseRunnerResponse(response(200, '{"ok":true}'))).resolves.toEqual({ ok: true });
  });

  it("surfaces the runner's error message", async () => {
    await expect(parseRunnerResponse(response(409, '{"error":"A preview is already running for this project"}'))).rejects.toThrow(/preview is already running/);
  });

  it("explains a proxy 502 HTML page instead of leaking a JSON parse error", async () => {
    await expect(parseRunnerResponse(response(502, "<html><body>Bad Gateway</body></html>"))).rejects.toThrow(/runner is unavailable/);
  });

  it("reports unreadable success bodies and non-JSON failures with the status", async () => {
    await expect(parseRunnerResponse(response(200, "<html/>"))).rejects.toThrow(/HTTP 200/);
    await expect(parseRunnerResponse(response(500, "boom"))).rejects.toThrow(/HTTP 500/);
  });
});
