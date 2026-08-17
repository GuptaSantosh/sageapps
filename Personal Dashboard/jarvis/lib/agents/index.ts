/**
 * Agent runner interface.
 *
 * One file per agent in /lib/agents/.
 * To wire a real agent: replace the mock function with a real API call.
 * The contract is always: (params) => Promise<AgentResult>
 * The UI only depends on AgentResult — it never needs to know what's behind it.
 */
import type { AgentResult } from '../types';
import { runMailSage } from './mail-sage';
import { runFinSage } from './fin-sage';
import { runTaxSageAnalyst } from './tax-sage';
import { runOpportunityRadar } from './opportunity-radar';
import { runContentAgent } from './content-agent';

const AGENT_RUNNERS: Record<string, (params: Record<string, string>) => Promise<AgentResult>> = {
  'mail-sage': runMailSage,
  'fin-sage': runFinSage,
  'tax-sage-analyst': runTaxSageAnalyst,
  'opportunity-radar': runOpportunityRadar,
  'content-agent': runContentAgent,
};

/**
 * Universal agent runner.
 * Replace mock implementations per-agent when real APIs are ready.
 */
export async function runAgent(agentId: string, params: Record<string, string> = {}): Promise<AgentResult> {
  const runner = AGENT_RUNNERS[agentId];
  if (!runner) {
    return {
      success: false,
      output: `No runner registered for agent: ${agentId}`,
      runId: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
    };
  }
  return runner(params);
}
