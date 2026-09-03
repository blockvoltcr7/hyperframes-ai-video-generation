import http from "node:http";
import { scanProjects } from "./catalog.js";
import { cancelJob, getJob, listJobs, preflight, runJob, shutdownJobs, stopPreview } from "./commands.js";
import { RunnerError, statusForError } from "./errors.js";

const port = Number(process.env.STUDIO_RUNNER_PORT ?? 4317);
const STUDIO_PORT = process.env.STUDIO_PORT ?? "5173";
// The Vite dev server proxies /api, so browsers normally never hit CORS. Direct calls are
// still allowed from either loopback spelling because AGENTS.md hands off 127.0.0.1 URLs.
const ALLOWED_ORIGINS = new Set([`http://localhost:${STUDIO_PORT}`, `http://127.0.0.1:${STUDIO_PORT}`]);
const MAX_BODY_BYTES = 64 * 1024;

function corsHeaders(req: http.IncomingMessage): Record<string, string> {
  const origin = req.headers.origin;
  return origin && ALLOWED_ORIGINS.has(origin) ? { "access-control-allow-origin": origin, vary: "origin" } : {};
}

function json(req: http.IncomingMessage, res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...corsHeaders(req) });
  res.end(JSON.stringify(data));
}

async function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) throw new RunnerError("Request body is too large");
  }
  if (!raw.trim()) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new RunnerError("Request body must be valid JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new RunnerError("Request body must be a JSON object");
  return parsed as Record<string, unknown>;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new RunnerError(`${field} must be a string`);
  return value;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    if (req.method === "OPTIONS") {
      res.writeHead(204, { ...corsHeaders(req), "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" });
      return res.end();
    }
    if (req.method === "GET" && url.pathname === "/api/health") return json(req, res, 200, { ok: true, runner: "local", port });
    if (req.method === "GET" && url.pathname === "/api/catalog") return json(req, res, 200, { projects: await scanProjects() });
    if (req.method === "GET" && url.pathname === "/api/preflight") return json(req, res, 200, { checks: await preflight() });
    if (req.method === "GET" && url.pathname === "/api/jobs") return json(req, res, 200, { jobs: listJobs() });
    if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
      const job = getJob(url.pathname.split("/").pop()!);
      return job ? json(req, res, 200, job) : json(req, res, 404, { error: "Job not found" });
    }
    if (req.method === "POST" && url.pathname === "/api/jobs") {
      const input = await body(req);
      const type = input.type;
      if (typeof type !== "string") throw new RunnerError("type is required");
      const job = await runJob({
        // runJob rejects unknown types; the cast only narrows the wire type for the call.
        type: type as Parameters<typeof runJob>[0]["type"],
        projectSlug: optionalString(input.projectSlug, "projectSlug"),
        topic: optionalString(input.topic, "topic"),
        template: optionalString(input.template, "template"),
        workflow: optionalString(input.workflow, "workflow"),
        images: optionalString(input.images, "images"),
      });
      return json(req, res, 202, job);
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/jobs/") && url.pathname.endsWith("/cancel")) {
      const job = cancelJob(url.pathname.split("/")[3]);
      return job ? json(req, res, 200, job) : json(req, res, 404, { error: "Job not found" });
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/preview/stop")) {
      const slug = url.pathname.split("/")[3];
      return json(req, res, 200, await stopPreview(slug));
    }
    return json(req, res, 404, { error: "Not found" });
  } catch (error) {
    return json(req, res, statusForError(error), { error: error instanceof Error ? error.message : "Request failed" });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`[studio-runner] listening on http://127.0.0.1:${port}`));

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[studio-runner] ${signal} received; stopping active jobs`);
    server.close();
    void shutdownJobs(`Runner received ${signal} before this job finished`).finally(() => process.exit(0));
  });
}
