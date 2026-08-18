/**
 * Private layout — enforces authentication server-side.
 *
 * This is the SECOND line of defense (after proxy.ts). It independently
 * checks the session so that:
 *   - Changing the proxy matcher cannot accidentally expose private pages.
 *   - Static analysis tools and future refactors cannot silently bypass auth.
 *
 * All pages under app/(private)/ inherit this layout and are therefore
 * always protected, regardless of proxy configuration.
 *
 * Dynamic rendering note:
 *   Calling auth() reads cookies/headers, which Next.js treats as dynamic.
 *   force-dynamic is set explicitly to prevent any edge-case static caching
 *   of private page output.
 */

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Defence in depth: redirect to login if no session, even if proxy passes
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 min-h-screen overflow-auto pl-[220px]">
        <div className="max-w-[1400px] mx-auto px-8 py-8">{children}</div>
      </main>
    </>
  );
}
