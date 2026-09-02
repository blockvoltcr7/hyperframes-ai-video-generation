import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const status = v.union(v.literal("queued"), v.literal("claimed"), v.literal("running"), v.literal("succeeded"), v.literal("failed"), v.literal("cancel-requested"), v.literal("cancelled"));

export const listRecent = query({ args: {}, handler: async (ctx) => ctx.db.query("jobs").order("desc").take(50) });

export const enqueue = mutation({
  args: { projectId: v.optional(v.id("projects")), driver: v.union(v.literal("codex"), v.literal("hyperframes")), type: v.string(), idempotencyKey: v.string(), command: v.array(v.string()) },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db.query("jobs").withIndex("by_idempotency", (q) => q.eq("idempotencyKey", args.idempotencyKey)).filter((q) => q.or(q.eq(q.field("status"), "queued"), q.eq(q.field("status"), "claimed"), q.eq(q.field("status"), "running"))).first();
    if (duplicate) throw new Error("An active job with this idempotency key already exists");
    return ctx.db.insert("jobs", { ...args, status: "queued", requestedAt: Date.now() });
  },
});

export const claim = mutation({ args: { jobId: v.id("jobs") }, handler: async (ctx, args) => { const job = await ctx.db.get(args.jobId); if (!job || job.status !== "queued") return null; const now = Date.now(); await ctx.db.patch(args.jobId, { status: "running", startedAt: now, heartbeatAt: now }); return args.jobId; } });
export const heartbeat = mutation({ args: { jobId: v.id("jobs"), progress: v.optional(v.number()), output: v.optional(v.string()) }, handler: async (ctx, args) => { await ctx.db.patch(args.jobId, { heartbeatAt: Date.now(), ...(args.progress === undefined ? {} : { progress: args.progress }), ...(args.output === undefined ? {} : { output: args.output }) }); } });
export const requestCancel = mutation({ args: { jobId: v.id("jobs") }, handler: async (ctx, args) => { await ctx.db.patch(args.jobId, { status: "cancel-requested" }); } });
export const complete = mutation({ args: { jobId: v.id("jobs"), status: status, output: v.optional(v.string()), errorMessage: v.optional(v.string()), resultManifestPath: v.optional(v.string()) }, handler: async (ctx, args) => { await ctx.db.patch(args.jobId, { status: args.status, output: args.output, errorMessage: args.errorMessage, resultManifestPath: args.resultManifestPath, finishedAt: Date.now() }); } });
