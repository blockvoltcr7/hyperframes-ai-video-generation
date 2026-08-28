import path from "node:path";
import fs from "node:fs";

export const REPO_ROOT = path.resolve(process.env.HF_REPO_ROOT ?? process.cwd());
export const STUDIO_ROOT = path.join(REPO_ROOT, ".studio");

const BLOCKED_ROOTS = [".git", ".venv", ".studio/logs"];
const ALLOWED_ROOTS = ["templates", "videos", "public", "shared", "scripts", ".studio"];

export function resolveRepoPath(relativePath: string, options: { allowMissing?: boolean } = {}): string {
  if (!relativePath || path.isAbsolute(relativePath)) throw new Error("Path must be repository-relative");
  const absolute = path.resolve(REPO_ROOT, relativePath);
  const relative = path.relative(REPO_ROOT, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path escapes repository root");

  const first = relative.split(path.sep).join("/").split("/")[0];
  const isEnvironmentFile = relative === ".env" || relative.startsWith(".env.");
  if (isEnvironmentFile || BLOCKED_ROOTS.some((blocked) => relative === blocked || relative.startsWith(`${blocked}/`))) {
    throw new Error("Path is protected");
  }
  if (!ALLOWED_ROOTS.includes(first)) throw new Error(`Path root is not allowed: ${first}`);

  if (!options.allowMissing && !fs.existsSync(absolute)) throw new Error(`Path does not exist: ${relativePath}`);
  if (fs.existsSync(absolute) && fs.lstatSync(absolute).isSymbolicLink()) throw new Error("Symlink paths are not allowed");
  return absolute;
}

export function projectPath(slug: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Invalid project slug");
  return resolveRepoPath(`videos/${slug}`, { allowMissing: true });
}
