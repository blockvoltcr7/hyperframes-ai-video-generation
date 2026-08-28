import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({ args: { jobId: v.id("jobs") }, handler: async (ctx, args) => ctx.db.query("jobEvents").withIndex("by_job", (q) => q.eq("jobId", args.jobId)).order("asc").collect() });
export const append = mutation({ args: { jobId: v.id("jobs"), level: v.union(v.literal("info"), v.literal("warn"), v.literal("error")), message: v.string() }, handler: async (ctx, args) => ctx.db.insert("jobEvents", { ...args, createdAt: Date.now() }) });
