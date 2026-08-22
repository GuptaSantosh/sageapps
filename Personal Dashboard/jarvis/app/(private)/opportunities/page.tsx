import { listOpportunities } from "@/lib/db/queries";
import { OpportunitiesClient } from "@/components/opportunities/opportunities-client";

/**
 * Opportunities page — Server Component.
 *
 * Fetches the live opportunity list from SQLite on every request.
 * All interactive state (filters, sort, selected row, forms) lives in
 * OpportunitiesClient. After create/edit mutations, the client calls
 * router.refresh() to re-execute this component and stream fresh data.
 *
 * Auth: already enforced by app/(private)/layout.tsx. The server actions
 * called from the client each run requireAuth() independently.
 */
export default async function OpportunitiesPage() {
  const opps = listOpportunities();
  return <OpportunitiesClient initialOpps={opps} />;
}
