// Map database failures to actionable messages without exposing connection details.
export function databaseSetupError(error: unknown) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
  if (code === "42P01" || code === "42703") {
    return {
      code: "DATABASE_SCHEMA_MISSING",
      error:
        "Database setup is incomplete. Run npm run db:migrate using the same database configuration as this app.",
    };
  }
  if (code === "28000" || code === "28P01") {
    return {
      code: "DATABASE_AUTH_FAILED",
      error:
        "Database sign-in failed. Check the username and password in DATABASE_URL. For local browser-storage mode, clear DATABASE_URL and restart the development server.",
    };
  }
  if (code === "3D000") {
    return {
      code: "DATABASE_NOT_FOUND",
      error:
        "The configured database does not exist. Create it or correct DATABASE_URL, then run npm run db:migrate.",
    };
  }
  return {
    code: "DATABASE_UNAVAILABLE",
    error:
      "Cannot reach the database rate limiter. Check database availability, connection settings and permissions, then retry.",
  };
}
