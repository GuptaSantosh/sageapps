import type { NextConfig } from "next";

/**
 * Content-Security-Policy
 *
 * Design decisions:
 *
 * script-src: 'unsafe-inline' is required because Next.js inlines scripts for
 * hydration. The proper upgrade path is nonce-based CSP (generate a per-request
 * nonce in proxy.ts and thread it through), but that adds complexity beyond
 * the current scope. 'unsafe-eval' is included only in development for webpack
 * hot-module replacement; it is excluded from the production policy.
 *
 * style-src: 'unsafe-inline' is required for Tailwind's inline style attributes
 * and shadcn/ui component styles.
 *
 * img-src: includes data: (inline SVGs) and avatars.githubusercontent.com
 * (GitHub profile images surfaced by Auth.js session data).
 *
 * font-src: Next.js font optimization (next/font) downloads fonts at build time
 * and serves them from 'self' — no external font CDN requests at runtime.
 *
 * form-action: includes https://github.com because the OAuth redirect POSTs
 * back through GitHub before returning to our callback URL.
 *
 * frame-ancestors 'none' + X-Frame-Options DENY: defence-in-depth against
 * clickjacking. Use both for maximum browser compatibility.
 *
 * HSTS: deliberately omitted here. In production, the nginx reverse proxy
 * that terminates TLS at jarvis.sageapps.in should own HSTS with appropriate
 * max-age and includeSubDomains settings. Setting HSTS in the Next.js response
 * can cause issues on misconfigured or mixed-TLS deployments.
 */

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",

  // Scripts: inline hydration always required; eval only in development
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",

  // Styles: inline styles required by Tailwind + shadcn
  "style-src 'self' 'unsafe-inline'",

  // Images: self + data URIs (inline SVG) + GitHub avatars
  "img-src 'self' data: https://avatars.githubusercontent.com",

  // Fonts: served from self (next/font pre-downloads at build time)
  "font-src 'self'",

  // XHR/fetch: self only (no external API calls from the browser)
  "connect-src 'self'",

  // Never load plugins or objects
  "object-src 'none'",

  // Prevent base-tag hijacking
  "base-uri 'self'",

  // Form submissions: self + GitHub OAuth redirect
  "form-action 'self' https://github.com",

  // Clickjacking: block all framing
  "frame-ancestors 'none'",

  // Workers: self only
  "worker-src 'self'",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: csp,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Defence-in-depth companion to frame-ancestors CSP directive.
    // frame-ancestors is the modern standard; X-Frame-Options covers
    // older browsers that do not parse CSP frame-ancestors.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    // Restrict access to sensitive browser APIs not used by this app.
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "interest-cohort=()", // opt out of FLoC/Topics
    ].join(", "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all responses
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
