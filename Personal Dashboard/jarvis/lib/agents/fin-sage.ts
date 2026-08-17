/**
 * FinSage agent runner — mock implementation.
 * TODO: replace with Claude API call + AIS document parsing.
 */
import type { AgentResult } from '../types';

const OUTPUTS: Record<string, string> = {
  'AIS/26AS Analysis': `**AIS Analysis — FY 2025-26**\n\nTotal income in AIS: ₹18,40,000\nExpected from records: ₹17,20,000\nGap: ₹1,20,000 — likely Razorpay settlements\n\n**Flags:**\n• TDS deducted ₹84,000 — verify Form 16A\n• Crypto transactions (3) — report under Schedule VDA\n• Dividend income ₹12,400 (HDFC AMC) — taxable\n\n**Next steps:**\n1. Download Q1 26AS from TRACES\n2. Match Razorpay settlements with bank statement\n3. Raise discrepancy query with CA before advance tax`,

  'Form 16 Review': `**Form 16 Review**\n\nGross salary: ₹25,00,000\nPerquisites: ₹1,20,000\nExemptions (HRA, LTA): ₹2,40,000\nNet taxable salary: ₹23,80,000\n\n**Deductions claimed:**\n• 80C: ₹1,50,000 (maxed)\n• 80D: ₹25,000\n• 80CCD(2): ₹1,20,000 — ⚠ Verify employer NPS contribution matches Form 12BB\n\n**Observation:** Standard deduction of ₹75,000 applied. Total tax ₹4,12,800.`,

  'Capital Gains Summary': `**Capital Gains — FY 2025-26**\n\nLTCG (equity, >1 yr): ₹2,34,000 — exempt up to ₹1L, taxable: ₹1,34,000 @ 12.5%\nSTCG (equity, <1 yr): ₹45,000 @ 20%\nCrypto gains: ₹18,000 @ 30% + surcharge\n\n**Tax on gains: ₹35,350**\nTDS credit from broker: ₹0 (self-declaration required)\n\n⚠ File ITR-2 (or ITR-3 if business income exists)`,

  'Regime Comparison': `**Old vs New Regime — ₹25L**\n\nOld Regime: ₹3,97,800 (after all deductions)\nNew Regime: ₹4,27,050\n\n**Savings in Old Regime: ₹29,250**\nBreak-even deduction point: ₹2,10,000\n\nRecommendation: Stick with Old Regime if you have maxed 80C + health insurance.`,
};

export async function runFinSage(params: Record<string, string>): Promise<AgentResult> {
  await new Promise((res) => setTimeout(res, 1800));

  const key = params.document_type || 'AIS/26AS Analysis';
  const output = OUTPUTS[key] ?? OUTPUTS['AIS/26AS Analysis'];

  return {
    success: true,
    output,
    runId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
}
