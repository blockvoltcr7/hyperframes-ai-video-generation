# Local Convex

The Convex schema and functions in this directory are the studio's metadata/job state layer. Generated bindings live in `convex/_generated/` and are intentionally ignored by Git.

To initialize a local deployment on a machine with Convex configured:

```bash
npx convex login
npx convex deployment create local
npx convex deployment select local
npx convex dev
```

The Vite studio does not require Convex to be running for its local catalog and runner diagnostics; it reads those from the runner API. Convex becomes the durable reactive state layer when the deployment is available.
# Convex mirror

The local runner's atomic `studio/state/jobs.json` ledger is the canonical store for local execution and restart recovery. These Convex tables are an optional remote catalog/mirror for multi-device visibility; they do not own local process lifecycle.

Driver values intentionally match the runner (`codex` and `hyperframes`). Preview URL/PID fields mirror HyperFrames 0.8 managed-preview ownership without treating a detached preview server as a still-running child job.
