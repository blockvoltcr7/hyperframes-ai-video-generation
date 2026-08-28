import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listForProject = query({ args: { projectId: v.id("projects") }, handler: async (ctx, args) => ctx.db.query("artifacts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect() });

export const reconcile = mutation({
  args: { projectId: v.id("projects"), kind: v.string(), relativePath: v.string(), exists: v.boolean(), sizeBytes: v.number(), hash: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("artifacts").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).filter((q) => q.eq(q.field("relativePath"), args.relativePath)).first();
    if (existing) { await ctx.db.patch(existing._id, { ...args, updatedAt: Date.now() }); return existing._id; }
    return ctx.db.insert("artifacts", { ...args, updatedAt: Date.now() });
  },
});
