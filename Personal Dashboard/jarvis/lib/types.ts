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

// ─── Opportunity Radar types ─────────────────────────────────────────────────
// Used by the Opportunity Radar agent output. Kept in types.ts so other
// components can import without depending on mock data.

export interface OpportunityScores {
  painSeverity: number;       // 1–10: how acutely people feel the problem
  frequency: number;          // 1–10: how often they encounter it
  willingnessToPay: number;   // 1–10: evidence of spend in this space
  founderFit: number;         // 1–10: Santosh's edge (fintech, India, AI, distribution)
  customerReach: number;      // 1–10: ease of finding and reaching these users
  speedToValidate: number;    // 1–10: how fast a landing page / prototype could get signal
  competitionIntensity: number; // 1–10: 10 = monopoly, 1 = crowded (higher = better)
  platformRisk: number;       // 1–10: 10 = no dependency risk, 1 = WhatsApp/Google-dependent
  defensibility: number;      // 1–10: moats (data, network, brand, switching cost)
  revenuePotential: number;   // 1–10: realistic ARR ceiling at scale
  overall: number;            // 1–10: calculated composite
}

export type OpportunityRecommendation = 'Validate Now' | 'Investigate' | 'Watch' | 'Ignore';

export interface Opportunity {
  id: string;
  title: string;
  thesis: string;          // 2–3 sentence "why this matters"
  scores: OpportunityScores;
  recommendation: OpportunityRecommendation;
  existingAlternatives: string[];
  sources: SourceRef[];
  tags: string[];
  discoveredAt: string;   // ISO date
}

// ─── Opportunity Workspace types ──────────────────────────────────────────────
// Richer model for the full Opportunity Radar workspace (lifecycle tracking,
// detailed evidence, scorecard justifications, validation plans).

export type OpportunityStatus =
  | 'new'
  | 'investigating'
  | 'validate-now'
  | 'validating'
  | 'build'
  | 'watch'
  | 'rejected'
  | 'archived';

export type SignalType =
  | 'complaint'
  | 'request'
  | 'workaround'
  | 'spending-intent'
  | 'competitor-dissatisfaction'
  | 'repeated-manual-workflow';

/** A rich evidence signal — backed by a real (future) or mocked (now) source */
export interface EvidenceSignal {
  id: string;
  platform: string;       // e.g. 'Reddit', 'Indie Hackers'
  title: string;          // post/comment title
  author?: string;        // username or handle
  date: string;           // ISO date string
  url?: string;           // placeholder — populated when live scraping is wired
  summary: string;        // 1–2 sentence signal summary
  signalType: SignalType;
}

/** One scoring dimension with its numeric score and a short written justification */
export interface ScoredDimension {
  score: number;          // 1–10
  justification: string;  // 1–2 sentences explaining this score
}

/** Full 10-dimension scorecard with individual justifications */
export interface DetailedScorecard {
  painSeverity: ScoredDimension;
  frequency: ScoredDimension;
  willingnessToPay: ScoredDimension;
  founderFit: ScoredDimension;
  customerReach: ScoredDimension;
  speedToValidate: ScoredDimension;
  competitionIntensity: ScoredDimension;
  platformRisk: ScoredDimension;
  defensibility: ScoredDimension;
  revenuePotential: ScoredDimension;
  overall: number;
  weightedNote: string;   // brief note on why overall is what it is
}

export interface CompetitiveAlternative {
  name: string;
  type: 'competitor' | 'workaround' | 'incumbent' | 'do-nothing';
  gap: string;            // what gap / opportunity this leaves open
}

/** 5-person, 3-question lightweight validation plan */
export interface ValidationPlan {
  targetPersona: string;
  peopleToFind: string[];         // 5 specific profile descriptions
  interviewQuestions: string[];   // 3 core questions
  smallestPrototype: string;      // minimum thing to build / test
  strongestAssumption: string;    // the one assumption that kills the idea if false
  successSignal: string;          // what does "go" look like?
  killSignal: string;             // what does "stop" look like?
}

/** Running checklist for opportunities in "Validating" status */
export interface ValidationChecklist {
  usersIdentified: boolean;       // 10 target users identified
  conversationsCompleted: number; // out of 5
  problemConfirmed: number;       // users who confirmed the problem (out of 3)
  solutionRequested: number;      // users who asked for the solution (out of 2)
  willingnessToPaySignal: boolean;
  workaroundDocumented: boolean;
}

export interface OpportunityThesis {
  problem: string;          // what is the problem?
  whoExperiencesIt: string; // who experiences it?
  whyItHurts: string;       // why does it hurt?
  whyTheyMightPay: string;  // why might they pay?
  whyNow: string;           // why is now the right time?
}

/** Full opportunity record for the Opportunity Radar workspace */
export interface OpportunityRecord {
  id: string;
  title: string;
  problemStatement: string;   // 1–2 sentence summary for list view
  targetCustomer: string;     // short customer description
  customerType: string;       // for filtering: 'Indian SMB', 'AI founders', etc.

  status: OpportunityStatus;
  thesis: OpportunityThesis;
  signals: EvidenceSignal[];
  scorecard: DetailedScorecard;
  alternatives: CompetitiveAlternative[];

  recommendation: OpportunityRecommendation;
  recommendationReason: string;   // 1–2 sentences

  validationPlan?: ValidationPlan;
  validationChecklist?: ValidationChecklist;

  tags: string[];
  discoveredAt: string;   // ISO date
  lastSeenAt: string;     // ISO date

  // Future: controls whether this record appears in public demo mode
  mode?: 'private' | 'demo';
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
