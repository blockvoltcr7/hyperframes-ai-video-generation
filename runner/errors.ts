export type RunnerErrorStatus = 400 | 404 | 409;

/**
 * Error carrying the HTTP status the runner API should answer with. Plain errors keep the
 * historical 400 mapping so path-policy and command-validation failures stay client errors.
 */
export class RunnerError extends Error {
  readonly status: RunnerErrorStatus;

  constructor(message: string, status: RunnerErrorStatus = 400) {
    super(message);
    this.name = "RunnerError";
    this.status = status;
  }
}

export function statusForError(error: unknown): number {
  return error instanceof RunnerError ? error.status : 400;
}
