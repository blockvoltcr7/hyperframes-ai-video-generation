import http from "node:http";
import { scanProjects } from "./catalog.js";
import { cancelJob, getJob, listJobs, preflight, runJob, stopPreview } from "./commands.js";

const port = Number(process.env.STUDIO_RUNNER_PORT ?? 4317);

function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "http://localhost:5173" });
  res.end(JSON.stringify(data));
}

async function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
    if (req.method === "OPTIONS") { res.writeHead(204, { "access-control-allow-origin": "http://localhost:5173", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "content-type" }); return res.end(); }
    if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { ok: true, runner: "local", port });
    if (req.method === "GET" && url.pathname === "/api/catalog") return json(res, 200, { projects: await scanProjects() });
    if (req.method === "GET" && url.pathname === "/api/preflight") return json(res, 200, { checks: await preflight() });
    if (req.method === "GET" && url.pathname === "/api/jobs") return json(res, 200, { jobs: listJobs() });
    if (req.method === "GET" && url.pathname.startsWith("/api/jobs/")) {
      const job = getJob(url.pathname.split("/").pop()!);
      return job ? json(res, 200, job) : json(res, 404, { error: "Job not found" });
    }
    if (req.method === "POST" && url.pathname === "/api/jobs") {
      const input = await body(req);
      const job = await runJob({ type: input.type as "generation" | "check" | "preview" | "render", projectSlug: input.projectSlug as string | undefined, topic: input.topic as string | undefined, template: input.template as string | undefined, workflow: input.workflow as string | undefined, images: input.images as string | undefined });
      return json(res, 202, job);
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/jobs/") && url.pathname.endsWith("/cancel")) {
      const job = cancelJob(url.pathname.split("/")[3]);
      return job ? json(res, 200, job) : json(res, 404, { error: "Job not found" });
    }
    if (req.method === "POST" && url.pathname.startsWith("/api/projects/") && url.pathname.endsWith("/preview/stop")) {
      const slug = url.pathname.split("/")[3];
      return json(res, 200, await stopPreview(slug));
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Request failed" });
  }
});

server.listen(port, "127.0.0.1", () => console.log(`[studio-runner] listening on http://127.0.0.1:${port}`));
