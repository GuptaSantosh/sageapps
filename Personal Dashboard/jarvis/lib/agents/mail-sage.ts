/**
 * MailSage agent runner — mock implementation.
 * TODO: replace with real Telegram bot trigger or Claude API call.
 */
import type { AgentResult } from '../types';

export async function runMailSage(_params: Record<string, string>): Promise<AgentResult> {
  // Simulate processing time
  await new Promise((res) => setTimeout(res, 2200));

  return {
    success: true,
    output: `**MailSage Brief — Manual Run**\n\n🔴 ACTION REQUIRED (1)\n1. *HDFC Bank* — Credit card statement due in 5 days\n\n🟡 FYI (3)\n1. *GitHub* — 2 new Dependabot alerts\n2. *DigitalOcean* — Monthly invoice ready\n3. *Zerodha* — Contract note for recent trade\n\n⚪ NOISE (7) — newsletters, promotions, automated alerts\n\n_Processed 11 emails · 0.8s fetch · 1.4s analysis_`,
    runId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
}
