/**
 * Minimal Worker fronting static assets.
 * Encryption still runs 100% in the browser — this Worker only serves files
 * and applies production security headers.
 */

/** @type {ExportedHandler<{ ASSETS: Fetcher }>} */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    return withSecurityHeaders(response);
  },
};

/**
 * @param {Response} response
 * @returns {Response}
 */
function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);

  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://static.cloudflareinsights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self' https://cloudflareinsights.com https://*.cloudflareinsights.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ")
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-XSS-Protection", "0");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
