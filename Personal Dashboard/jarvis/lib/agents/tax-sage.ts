/**
 * TaxSage Analyst runner — mock implementation.
 * TODO: replace with real TaxSage API or Claude API call.
 */
import type { AgentResult } from '../types';

export async function runTaxSageAnalyst(params: Record<string, string>): Promise<AgentResult> {
  await new Promise((res) => setTimeout(res, 1500));

  const salary = parseInt(params.gross_salary || '2500000', 10);
  const salaryL = (salary / 100000).toFixed(0);

  // Rough tax calc for illustration
  const newRegimeTax = Math.round(salary * 0.171);
  const oldRegimeTax = Math.round(salary * 0.159);
  const saving = newRegimeTax - oldRegimeTax;

  return {
    success: true,
    output: `**Tax Regime Comparison — ₹${salaryL}L Gross**\n\nOld Regime (with 80C ₹1.5L + 80D ₹25K + HRA):\n• Taxable income: ~₹${((salary - 350000) / 100000).toFixed(1)}L\n• Tax + cess: **₹${(oldRegimeTax).toLocaleString('en-IN')}**\n\nNew Regime:\n• Standard deduction ₹75,000 applied\n• Tax + cess: **₹${(newRegimeTax).toLocaleString('en-IN')}**\n\n**Verdict: OLD REGIME saves ₹${saving.toLocaleString('en-IN')}**\n\nBreak-even: If total deductions fall below ₹2,10,000, new regime wins.`,
    runId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
}
