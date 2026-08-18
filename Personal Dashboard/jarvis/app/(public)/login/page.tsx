/**
 * Login page — public, no sidebar.
 *
 * Single action: "Continue with GitHub" triggers the GitHub OAuth flow.
 * No password field. No alternative providers. No public signup language.
 *
 * callbackUrl is sanitized server-side before being passed to Auth.js:
 *   - Must start with "/"
 *   - Must not contain "//" (blocks protocol-relative external URLs)
 *   - Falls back to "/" if invalid or absent
 */

import { signIn } from "@/auth";
import { Zap } from "lucide-react";

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const raw = params.callbackUrl ?? "";

  // Sanitize: only accept same-origin relative paths.
  // Rejection criteria (any one fails → fall back to "/"):
  //   - not a string, or empty
  //   - doesn't start with "/" (absolute URL, e.g. "https://evil.com")
  //   - starts with "//" (protocol-relative URL, e.g. "//evil.com")
  //   - starts with "/login" (avoids redirect loops)
  //   - starts with "/api/auth" (avoids redirecting into auth endpoints)
  //   - contains ":" before the first "/" (catches "javascript:" and similar)
  const safeCallbackUrl =
    typeof raw === "string" &&
    raw.length > 0 &&
    raw.startsWith("/") &&
    !raw.startsWith("//") &&
    !raw.startsWith("/login") &&
    !raw.startsWith("/api/auth") &&
    !/^[^/]*:/.test(raw)
      ? raw
      : "/";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Mark */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              Santosh Jarvis
            </h1>
            <p className="text-sm text-muted-foreground">
              Private AI Command Center
            </p>
          </div>
        </div>

        {/* Auth card */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: safeCallbackUrl });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-foreground text-background rounded-md text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              {/* GitHub mark */}
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className="w-4 h-4 fill-current flex-shrink-0"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Continue with GitHub
            </button>
          </form>

          <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed">
            Access is restricted to the authorized account only.
          </p>
        </div>
      </div>
    </div>
  );
}
