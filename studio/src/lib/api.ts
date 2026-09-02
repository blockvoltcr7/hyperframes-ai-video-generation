import type { JobSummary, PreflightCheck, ProjectSummary } from "../../../runner/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error ?? "Runner request failed");
  return payload;
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
