/**
 * @statuz/sdk-ts — public API
 *
 * Core runtime (Statuz), coordination (Signal Bus), and the three-layer
 * stack: Core (runtime status), niche (ecological position), SYN
 * (human governance), and 66 (Arrow Maps — topological relationships).
 */

export { Statuz } from "./statuz.js";
export { CoordinationClient } from "./coordination.js";

// niche IO classes
export { NicheManifestIO } from "./niche/manifest.js";

// SYN IO classes
export { SynRequestIO } from "./syn/request.js";
export { SynResolutionIO } from "./syn/resolution.js";

// Arrow Map IO classes
export { ArrowMapIO } from "./arrow-map/arrow-map.js";
export { ArrowProposalIO } from "./arrow-map/proposal.js";
export { ArrowMapClusterIO } from "./arrow-map/cluster.js";

// Core types
export type {
  StatuzDocument,
  Checkpoint,
  Identity,
  Role,
  Goal,
  CurrentState,
  Progress,
  AgentRelation,
  Relations,
  Rules,
  ValidationResult,
  StatusValue,
  StageValue
} from "./types.js";

// Signal bus types
export type {
  Signal,
  SynRequest as CoordinationSynRequest,
  SignalResponse,
  SynResponse,
  AgentInfo,
  CoordinationConfig
} from "./coordination.js";

// niche types
export type {
  NicheVersion,
  NicheManifest,
  DeclaredPosition,
  DriftThresholds,
  NicheContext,
  NicheContextReferences,
  NicheContextAttachment,
  NicheSignal,
  SignalDetails,
  NicheAssessment,
  ImpactAnalysis,
  NicheCalibration,
  EvidenceWindow,
  DriftAnalysis,
  DriftMetric,
  ProposedChange,
  NicheOutcome,
  OutcomeDetails
} from "./niche/types.js";

// SYN types
export type {
  SynVersion,
  SynRequest,
  SynContext,
  SynOption,
  SynResolution,
  SynDocument
} from "./syn/types.js";
export { isSynRequest, isSynResolution } from "./syn/types.js";

// Arrow Map (66) types
export type {
  ArrowMapVersion,
  ArrowMapStatus,
  ArrowType,
  Criticality,
  NodeStatus,
  DiscoveryMethod,
  ArrowMap,
  StatuNode,
  NodeProperties,
  NodeMetadata,
  Arrow,
  ArrowProperties,
  DependencyProperties,
  InformationFlowProperties,
  ResponsibilityProperties,
  ValidationProperties,
  ResourceTransferProperties,
  InfluenceProperties,
  ConstraintProperties,
  TypeProperties,
  ArrowTemporal,
  ArrowMetadata,
  Invariant,
  TemplateParam,
  MapExtend,
  MapStorage,
  MapMetadata
} from "./arrow-map/types.js";
export type {
  ProposalVersion,
  ProposalType,
  ProposalStatus,
  ProposalAction,
  ProposalTarget,
  NodeChange,
  ArrowChange,
  ProposalChange,
  ReviewComment,
  ArrowProposal
} from "./arrow-map/proposal-types.js";

// Arrow Map Cluster types
export type {
  MapScope,
  ClusterMapRef,
  CrossMapArrow,
  ClusterMetadata,
  ArrowMapCluster,
  ClusterOptions
} from "./arrow-map/cluster-types.js";

// Calibration Engine (drift detection)
export { CalibrationEngine } from "./calibration/engine.js";
export type {
  EvidenceItem,
  DriftResult,
  CalibrationResult,
  CalibrationOptions
} from "./calibration/types.js";

// Lease Manager (time-boxed responsibility)
export { LeaseManager } from "./lease/manager.js";
export type {
  Lease,
  LeaseAcceptance,
  LeaseReport,
  LeaseScope,
  LeaseCheckpoint
} from "./lease/types.js";

// User Action Tracker
export { UserActionTracker } from "./user-action/tracker.js";
export type {
  UserActionVersion,
  UserActionType,
  UserActionContext,
  UserAction,
  UserActionQuery,
  UserActionStats,
  UserActionExportOptions
} from "./user-action/types.js";

// Status Keeper (health checks)
export { StatusKeeperEngine } from "./status-keeper/engine.js";
export type {
  CheckType,
  SeverityLevel,
  ScheduleFrequency,
  OutputFormat,
  HealthCheck,
  ScheduleConfig,
  OutputConfig,
  StatusKeeperConfig,
  CheckResult,
  HealthStatus,
  HealthReport
} from "./status-keeper/types.js";
