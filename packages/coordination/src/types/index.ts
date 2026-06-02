// Signal Hub Types
export interface Signal {
  id: string;
  type: string;
  projectId: string;
  source: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface CreateSignalInput {
  type: string;
  projectId: string;
  source: string;
  payload: Record<string, unknown>;
}

// SYN Queue Types
export enum SynStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected"
}

export interface SynRequest {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: SynStatus;
  evidence: Record<string, unknown>;
  options: Record<string, unknown>[];
  createdAt: string;
  resolvedAt?: string;
  resolver?: string;
}

export interface CreateSynInput {
  title: string;
  description: string;
  projectId: string;
  evidence: Record<string, unknown>;
  options: Record<string, unknown>[];
}

export interface UpdateSynInput {
  status: SynStatus;
  resolver: string;
}
