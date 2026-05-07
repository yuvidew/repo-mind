const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);

export function normalizePostgresSslMode(connectionString: string | undefined) {
  if (!connectionString) return connectionString;

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (!sslMode || !LEGACY_SSL_MODES.has(sslMode)) {
      return connectionString;
    }

    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  } catch {
    return connectionString;
  }
}
