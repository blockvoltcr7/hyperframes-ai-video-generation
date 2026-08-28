import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({ args: {}, handler: async (ctx) => ctx.db.query("projects").withIndex("by_status").order("desc").collect() });

export const get = query({ args: { slug: v.string() }, handler: async (ctx, args) => ctx.db.query("projects").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique() });

export const reconcile = mutation({
  args: { slug: v.string(), title: v.string(), template: v.string(), relativePath: v.string(), status: v.union(v.literal("ready"), v.literal("missing"), v.literal("incomplete")), sourceFingerprint: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("projects").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique();
    if (existing) { await ctx.db.patch(existing._id, { ...args, lastScannedAt: now, updatedAt: now }); return existing._id; }
    return ctx.db.insert("projects", { ...args, lastScannedAt: now, createdAt: now, updatedAt: now });
  },
});

export const markMissing = mutation({ args: { slug: v.string() }, handler: async (ctx, args) => { const project = await ctx.db.query("projects").withIndex("by_slug", (q) => q.eq("slug", args.slug)).unique(); if (!project) return null; await ctx.db.patch(project._id, { status: "missing", updatedAt: Date.now() }); return project._id; } });
