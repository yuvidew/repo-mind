export class PublicAppError extends Error {
  code: string;
  status: number;

  constructor(input: { code: string; message: string; status?: number }) {
    super(input.message);
    this.name = "PublicAppError";
    this.code = input.code;
    this.status = input.status ?? 400;
  }
}

export function isPublicAppError(error: unknown): error is PublicAppError {
  return error instanceof PublicAppError;
}

export function getPublicErrorMessage(error: unknown, fallback: string) {
  if (isPublicAppError(error)) return error.message;

  return fallback;
}

export function toApiErrorResponse(
  error: unknown,
  input: {
    fallbackMessage: string;
    fallbackStatus?: number;
  },
) {
  if (isPublicAppError(error)) {
    const payload: Record<string, unknown> = {
      code: error.code,
      error: error.message,
    };

    if ("limit" in error && typeof error.limit === "number") {
      payload.limit = error.limit;
    }

    if ("remaining" in error && typeof error.remaining === "number") {
      payload.remaining = error.remaining;
    }

    if ("resetAt" in error && error.resetAt instanceof Date) {
      payload.resetAt = error.resetAt.toISOString();
    }

    return Response.json(payload, { status: error.status });
  }

  return Response.json(
    { error: input.fallbackMessage },
    { status: input.fallbackStatus ?? 500 },
  );
}
