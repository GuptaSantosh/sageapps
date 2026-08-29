// ─── Data connectivity state ────────────────────────────────────────────────
// Used on metrics, agents, and any panel to signal whether the data is live,
// a demo placeholder, or simply not yet wired to a real source.

export type DataState = 'live' | 'demo' | 'not-connected';

// ─── Agent types ─────────────────────────────────────────────────────────────

export type AgentType = 'click-triggered' | 'autonomous';
export type AgentStatus = 'idle' | 'running' | 'needs-approval' | 'error';
export type RunStatus = 'success' | 'error' | 'running';

// How the agent is triggered. Matches AgentType but expressed as user-facing intent.
export type TriggerType = 'manual' | 'scheduled' | 'event-triggered';

export interface AgentInputParam {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
}

/** A single source reference — used by research agents like Opportunity Radar */
export interface SourceRef {
  platform: string;    // e.g. 'Reddit', 'Indie Hackers', 'Product Hunt'
  label: string;       // e.g. 'r/IndiaInvestments thread — "GST nightmare for freelancers"'
  url?: string;        // optional: will be populated when real scraping is wired
  observedAt?: string; // ISO date
}

export interface AgentRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: RunStatus;
  output: string;
  params?: Record<string, string>;
  sources?: SourceRef[];  // populated by research agents
  tokenUsage?: number;    // future: actual token count
  costUsd?: number;       // future: actual cost
}

export interface ApprovalItem {
  id: string;
  agentId: string;
  description: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;

  // Execution model
  type: AgentType;
  triggerType: TriggerType;
  status: AgentStatus;

  // Data connectivity — is this agent actually wired to real APIs?
  dataState: DataState;

  // Scheduling (autonomous only)
  schedule?: string;
  enabled?: boolean;

  // Prompt & configuration
  systemPrompt: string;
  inputParams: AgentInputParam[];

  // Runtime metadata
  lastRunAt: string;
  runHistory: AgentRun[];
  pendingApprovals?: ApprovalItem[];

  // Provenance (for the agent detail view)
  model?: string;        // e.g. 'claude-sonnet-4-6' — set when real model is wired
  connectors?: string[]; // e.g. ['Gmail', 'Telegram'] — data sources/sinks
  workspaceUrl?: string; // optional link to a dedicated workspace page (e.g. /opportunities)
}

export interface AgentResult {
  success: boolean;
  output: string;
  runId: string;
  completedAt: string;
  sources?: SourceRef[];
}

// ─── Opportunity evaluation types (V0.1 rubric) ───────────────────────────────
// Canonical design: docs/OPPORTUNITY_EVALUATION_RUBRIC.md
// AI scores each dimension 0–10 (raw). Code computes weightedScore = rawScore/10 × weight.

export type OpportunityRecommendation = 'Validate Now' | 'Investigate' | 'Watch' | 'Reject';

/** One dimension of the V0.1 rubric — as stored in the scorecard JSON blob. */
export interface RubricDimension {
  score:         number;   // 0–10 raw score from Claude
  weight:        number;   // fixed per rubric: 15 | 10 | 5
  weightedScore: number;   // score / 10 × weight
  justification: string;   // 1–2 sentences from Claude
}

/**
 * Nine-dimension scorecard matching the V0.1 rubric weights.
 * Total = sum of all weightedScore values (0–100).
 */
export interface EvaluationScorecard {
  problemSeverityFrequency: RubricDimension; // weight 15
  evidenceStrength:         RubricDimension; // weight 15
  willingnessToPay:         RubricDimension; // weight 15
  founderMarketFit:         RubricDimension; // weight 15
  customerAccessDistrib:    RubricDimension; // weight 10
  solopreneurFeasibility:   RubricDimension; // weight 10
  speedToValidation:        RubricDimension; // weight 10
  marketExpansionPotential: RubricDimension; // weight 5
  differentiation:          RubricDimension; // weight 5
  totalScore:               number;          // 0–100
}

/**
 * Narrative fields returned alongside the scorecard.
 * Separating facts from assumptions is intentional — the rubric evaluates
 * evidence quality, not merely opinion.
 */
export interface EvaluationNarrative {
  confidence:         'low' | 'medium' | 'high';
  evidenceUrlsUsed:   string[];   // subset of the opportunity's evidence URLs
  factsVsAssumptions: string;     // what Claude treated as fact vs inferred
  missingEvidence:    string[];   // data points that would meaningfully change the score
  strongestObjection: string;     // the single most important failure risk
  cheapestExperiment: string;     // lowest-cost test to validate/kill the key assumption
  estimatedTimeCost:  string;     // e.g. "2 weeks / ~₹5 000"
}

/**
 * Full evaluation result — serialised as JSON into opportunities.scorecard.
 * Columns opportunities.eval_score, opportunities.evaluated_at, and
 * opportunities.recommendation are stored separately for fast querying.
 */
export interface OpportunityEvaluation {
  scorecard:   EvaluationScorecard;
  narrative:   EvaluationNarrative;
  evaluatedAt: string;   // ISO 8601 UTC (mirrors the evaluated_at column)
  modelUsed:   string;   // e.g. 'claude-sonnet-4-6'
}

// ─── Opportunity Workspace types ──────────────────────────────────────────────

export type OpportunityStatus =
  | 'new'
  | 'investigating'
  | 'validate-now'
  | 'validating'
  | 'build'
  | 'watch'
  | 'rejected'
  | 'archived';

// Signal types — mirrors signal_type values in the opportunity_evidence DB column.
export type SignalType =
  | 'complaint'
  | 'request'
  | 'workaround'
  | 'spending-intent'
  | 'competitor-dissatisfaction'
  | 'repeated-manual-workflow';

/** Running checklist for opportunities in "Validating" status */
export interface ValidationChecklist {
  usersIdentified: boolean;
  conversationsCompleted: number; // out of 5
  problemConfirmed: number;       // out of 3
  solutionRequested: number;      // out of 2
  willingnessToPaySignal: boolean;
  workaroundDocumented: boolean;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = 'live' | 'in-progress' | 'planned' | 'paused';

export interface Project {
  id: string;
  name: string;
  tagline: string;
  status: ProjectStatus;
  keyMetric: string;
  keyMetricLabel: string;
  nextMilestone: string;
  progress: number;
  tags: string[];
  startedAt: string;
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  type: 'agent_run' | 'agent_approved' | 'agent_rejected' | 'project_update' | 'system';
  title: string;
  description: string;
  timestamp: string;
  agentId?: string;
  dataState?: DataState;  // inherit from agent, or override
}

// ─── Overview metrics ─────────────────────────────────────────────────────────

export interface MetricCard {
  id: string;
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  unit?: string;
  dataState: DataState;  // required — all metrics must declare their data source status
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface WinEntry {
  id: string;
  date: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface ChartDataPoint {
  date: string;
  agentRuns: number;
  manualTasks: number;
  timeSavedMinutes: number;
}
