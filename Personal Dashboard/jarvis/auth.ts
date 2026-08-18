/**
 * Auth.js v5 configuration — Jarvis private command center.
 *
 * Authorization model:
 *   - Single authorized user identified by immutable GitHub numeric ID.
 *   - ID is compared as a string to avoid JS number precision edge cases.
 *   - All other identifiers (username, email, display name) are explicitly
 *     NOT used for authorization — they are mutable and can be changed.
 *
 * Fail-closed: missing configuration → access denied. Always.
 *
 * Future demo route note:
 *   If a public /demo route is ever added, it MUST use separate demo-only
 *   data sources and MUST NOT use this auth config to gate any private data.
 *   Demo vs. private data separation must be enforced server-side, never by
 *   NEXT_PUBLIC_APP_MODE or any client-visible flag.
 */

import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],

  session: {
    strategy: "jwt",
    // 24-hour session lifetime in production.
    // Auth.js respects this for both cookie maxAge and JWT expiry.
    maxAge: 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/login", // redirect OAuth errors back to login, not to a separate error page
  },

  callbacks: {
    /**
     * signIn callback — the primary authorization gate.
     *
     * Returns true only when ALL conditions hold:
     *  1. Provider is GitHub (not any other OAuth provider added later).
     *  2. AUTHORIZED_GITHUB_ID is configured.
     *  3. GitHub returned a numeric profile ID.
     *  4. That ID exactly matches the configured allowlist value.
     *
     * Any missing, malformed, or non-matching condition → false → denied.
     */
    signIn({ account, profile }) {
      // Gate 1: must be GitHub
      if (account?.provider !== "github") return false;

      // Gate 2: allowlist must be configured
      const authorizedId = process.env.AUTHORIZED_GITHUB_ID;
      if (!authorizedId || authorizedId.trim() === "") return false;

      // Gate 3: GitHub must have returned a profile with a numeric ID
      const profileId = profile?.id;
      if (profileId === undefined || profileId === null) return false;

      // Gate 4: exact numeric ID match (compared as strings)
      return String(profileId) === authorizedId.trim();
    },

    /**
     * jwt callback — persist only the minimum identity data in the token.
     * Runs when a JWT is created or updated.
     */
    jwt({ token, profile }) {
      if (profile?.id !== undefined) {
        // Store as string — the one stable identifier we carry
        token.githubId = String(profile.id);
      }
      return token;
    },

    /**
     * session callback — expose only the github ID to the session.
     * Never expose the raw JWT token to client components.
     */
    session({ session, token }) {
      if (session.user && token.githubId) {
        (session.user as typeof session.user & { githubId: string }).githubId =
          token.githubId as string;
      }
      return session;
    },
  },
});
