export type ProjectStatus = "ready" | "missing" | "incomplete";

export type ArtifactKind =
  | "composition"
  | "script"
  | "transcript"
  | "narration"
  | "design"
  | "storyboard"
  | "visual-plan"
  | "asset-plan"
  | "asset-manifest"
  | "sources"
  | "qa"
  | "metadata"
  | "render";

export interface Artifact {
  kind: ArtifactKind;
  relativePath: string;
  exists: boolean;
  sizeBytes: number;
  modifiedAt: string | null;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  path: string;
  template: string;
  workflow?: "adaptive" | "template" | "presentation" | "general-video";
  qaStatus?: "passed" | "failed" | "stale" | "pending-review" | "missing";
  status: ProjectStatus;
  artifacts: Artifact[];
  updatedAt: string | null;
}

export interface PreflightCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface JobSummary {
  id: string;
  driver: "codex" | "hyperframes";
  type: "generation" | "check" | "preview" | "render";
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  projectSlug?: string;
  command: string[];
  output: string;
  error?: string;
  previewUrl?: string;
  previewPid?: number;
  startedAt: string;
  finishedAt?: string;
}
