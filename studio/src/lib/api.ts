import type { JobSummary, PreflightCheck, ProjectSummary } from "../../../runner/types";

/**
 * Turn a runner response into its JSON payload or a readable error. When the runner is down
 * the Vite proxy answers with an HTML 502/504 page, so the body cannot be assumed to be JSON.
 */
export async function parseRunnerResponse<T>(response: { ok: boolean; status: number; text(): Promise<string> }): Promise<T> {
  const raw = await response.text();
  let payload: unknown;
  try { payload = raw ? JSON.parse(raw) : undefined; } catch { payload = undefined; }
  if (response.ok) {
    if (payload === undefined) throw new Error(`Runner returned an unreadable response (HTTP ${response.status})`);
    return payload as T;
  }
  const message = payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string"
    ? (payload as { error: string }).error
    : response.status === 502 || response.status === 504
      ? "Local runner is unavailable. Start it with `npm run dev:runner`."
      : `Runner request failed (HTTP ${response.status})`;
  throw new Error(message);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new Error("Local runner is unreachable. Start it with `npm run dev:runner`.");
  }
  return parseRunnerResponse<T>(response);
}

export const api = {
  catalog: () => request<{ projects: ProjectSummary[] }>("/api/catalog"),
  preflight: () => request<{ checks: PreflightCheck[] }>("/api/preflight"),
  jobs: () => request<{ jobs: JobSummary[] }>("/api/jobs"),
  job: (id: string) => request<JobSummary>(`/api/jobs/${encodeURIComponent(id)}`),
  startGeneration: (input: { topic: string; template: string; workflow: string; images: string }) => request<JobSummary>("/api/jobs", { method: "POST", body: JSON.stringify({ ...input, type: "generation" }) }),
  check: (projectSlug: string) => request<JobSummary>("/api/jobs", { method: "POST", body: JSON.stringify({ projectSlug, type: "check" }) }),
  preview: (projectSlug: string) => request<JobSummary>("/api/jobs", { method: "POST", body: JSON.stringify({ projectSlug, type: "preview" }) }),
  render: (projectSlug: string) => request<JobSummary>("/api/jobs", { method: "POST", body: JSON.stringify({ projectSlug, type: "render" }) }),
  cancel: (jobId: string) => request<JobSummary>(`/api/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" }),
  stopPreview: (projectSlug: string) => request<unknown>(`/api/projects/${encodeURIComponent(projectSlug)}/preview/stop`, { method: "POST" }),
};
