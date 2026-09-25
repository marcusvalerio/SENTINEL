/** Shared by the proxy (edge of the request) and the server auth layer. */
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-sentinel_session" : "sentinel_session";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Sessions are silently extended when less than this remains. */
export const SESSION_RENEW_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;
