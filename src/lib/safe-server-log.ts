type SafeLogPrimitive = boolean | number | string | null;

type SafeLogMetadata = Record<string, Error | SafeLogPrimitive | undefined>;

const MAX_LOG_STRING_LENGTH = 500;

export function logServerError(event: string, metadata: SafeLogMetadata = {}) {
  console.error(event, sanitizeLogMetadata(metadata));
}

export function logServerWarning(
  event: string,
  metadata: SafeLogMetadata = {},
) {
  console.warn(event, sanitizeLogMetadata(metadata));
}

export function sanitizeLogMetadata(metadata: SafeLogMetadata) {
  const safeMetadata: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) continue;

    safeMetadata[key] = sanitizeLogValue(value);
  }

  return safeMetadata;
}

function sanitizeLogValue(value: Error | SafeLogPrimitive) {
  if (value instanceof Error) {
    return {
      message: sanitizeString(value.message),
      name: sanitizeString(value.name || "Error"),
    };
  }

  if (typeof value === "string") return sanitizeString(value);

  return value;
}

function sanitizeString(value: string) {
  return value.length > MAX_LOG_STRING_LENGTH
    ? `${value.slice(0, MAX_LOG_STRING_LENGTH)}...`
    : value;
}
