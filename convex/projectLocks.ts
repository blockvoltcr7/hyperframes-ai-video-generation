import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const acquire = mutation({ args: { projectId: v.id("projects"), jobId: v.id("jobs"), leaseMs: v.number() }, handler: async (ctx, args) => { const existing = await ctx.db.query("projectLocks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).unique(); const now = Date.now(); if (existing && existing.leaseUntil > now) throw new Error("Project is already locked"); if (existing) await ctx.db.delete(existing._id); return ctx.db.insert("projectLocks", { projectId: args.projectId, jobId: args.jobId, acquiredAt: now, leaseUntil: now + args.leaseMs }); } });
export const release = mutation({ args: { projectId: v.id("projects"), jobId: v.id("jobs") }, handler: async (ctx, args) => { const lock = await ctx.db.query("projectLocks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).unique(); if (lock?.jobId === args.jobId) await ctx.db.delete(lock._id); } });
