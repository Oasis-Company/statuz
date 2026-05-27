export interface StatuzDocument {
  statuz_version: "0.1";
  updated_at?: string;
  identity: {
    agent_name: string;
    agent_id?: string;
    project_name: string;
    organization?: string;
    environment?: string;
    [key: string]: unknown;
  };
  role?: {
    name?: string;
    responsibilities?: string[];
    boundaries?: string[];
    [key: string]: unknown;
  };
  goal?: {
    primary?: string;
    secondary?: string[];
    [key: string]: unknown;
  };
  current_state: {
    stage?: string;
    task?: string;
    status: string;
    last_checkpoint?: string;
    next_action?: string;
    [key: string]: unknown;
  };
  progress?: {
    completed?: string[];
    blocked_by?: string[];
    open_questions?: string[];
    [key: string]: unknown;
  };
  relations?: {
    related_agents?: string[];
    related_projects?: string[];
    related_files?: string[];
    related_tools?: string[];
    agent_graph?: Array<{ from: string; to: string; type: string; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  rules?: {
    should?: string[];
    should_not?: string[];
    [key: string]: unknown;
  };
  checkpoints?: Array<{
    id: string;
    at: string;
    summary: string;
    decision?: string;
    evidence?: string[];
    next_action?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}
