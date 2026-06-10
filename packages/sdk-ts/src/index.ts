/**
 * @statuz/sdk-ts — public API
 *
 * Core runtime (Statuz), coordination (Signal Bus), and the three-layer
 * stack: Core (runtime status), niche (ecological position), SYN
 * (human governance), and 66 (Arrow Maps — topological relationships).
 */

export { Statuz } from "./statuz.js";
export { CoordinationClient } from "./coordination.js";

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
export { isSynRequest, isSynResolution } from "./syn/types.js";

// SYN types
export type {
  SynVersion,
  SynRequest,
  SynContext,
  SynOption,
  SynResolution,
  SynDocument
} from "./syn/types.js";

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
