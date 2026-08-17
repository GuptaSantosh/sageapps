/**
 * Content Pulse — mock implementation.
 * TODO: replace with Claude API call (claude-sonnet-4-6 or opus-4-6).
 */
import type { AgentResult } from '../types';

export async function runContentAgent(params: Record<string, string>): Promise<AgentResult> {
  await new Promise((res) => setTimeout(res, 2800));

  const platform = params.platform || 'LinkedIn';
  const topic = params.topic || 'latest milestone';

  const linkedInPost = `Built ${topic} this week.\n\nNot because the roadmap said so — but because someone asked a question I couldn't answer fast enough.\n\nThe best tools come from real friction, not product specs.\n\nIf you're building for Indian consumers, here's what I've learned: people don't want "AI." They want their specific problem solved in a way that doesn't feel like homework.\n\nThat's it. That's the whole insight.\n\nLive at sageapps.in — free, no signup required.\n\nWhat's the most useful thing you've built because someone asked a dumb question?`;

  const tweet = `Shipped: ${topic}\n\nLearning: the best products are built from embarrassingly specific problems.\n\nsageapps.in — free, no login`;

  const output = platform === 'Twitter/X' ? tweet : linkedInPost;

  return {
    success: true,
    output: `**${platform} Draft**\n\n${output}\n\n_${output.split(' ').length} words · Ready to post_`,
    runId: crypto.randomUUID(),
    completedAt: new Date().toISOString(),
  };
}
