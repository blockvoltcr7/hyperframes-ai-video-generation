import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const projectStatus = v.union(v.literal("ready"), v.literal("missing"), v.literal("incomplete"));
const jobStatus = v.union(v.literal("queued"), v.literal("claimed"), v.literal("running"), v.literal("succeeded"), v.literal("failed"), v.literal("cancel-requested"), v.literal("cancelled"));

export default defineSchema({
  projects: defineTable({
    slug: v.string(),
    title: v.string(),
    topic: v.optional(v.string()),
    template: v.string(),
    relativePath: v.string(),
    status: projectStatus,
    sourceFingerprint: v.optional(v.string()),
    lastScannedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]).index("by_status", ["status"]),
  artifacts: defineTable({
    projectId: v.id("projects"),
    kind: v.string(),
    relativePath: v.string(),
    exists: v.boolean(),
    sizeBytes: v.number(),
    hash: v.optional(v.string()),
    generatedByJobId: v.optional(v.id("jobs")),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),
  jobs: defineTable({
    projectId: v.optional(v.id("projects")),
    driver: v.union(v.literal("codex"), v.literal("hyperframes")),
    type: v.string(),
    status: jobStatus,
    idempotencyKey: v.string(),
    progress: v.optional(v.number()),
    command: v.array(v.string()),
    output: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    requestedAt: v.number(),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    heartbeatAt: v.optional(v.number()),
    logPath: v.optional(v.string()),
    resultManifestPath: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    previewPid: v.optional(v.number()),
  }).index("by_project", ["projectId"]).index("by_status", ["status"]).index("by_idempotency", ["idempotencyKey"]),
  jobEvents: defineTable({
    jobId: v.id("jobs"),
    level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_job", ["jobId"]),
  projectLocks: defineTable({
    projectId: v.id("projects"),
    jobId: v.id("jobs"),
    leaseUntil: v.number(),
    acquiredAt: v.number(),
  }).index("by_project", ["projectId"]),
});
