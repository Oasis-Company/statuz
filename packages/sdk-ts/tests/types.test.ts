/**
 * @statuz/sdk-ts — type definition tests
 *
 * Verifies that TypeScript interfaces for niche, SYN, and Arrow Map
 * documents can be instantiated and serialized without errors.
 */

import { describe, it, expect } from "vitest";
import YAML from "yaml";

import type {
  NicheManifest,
  NicheSignal,
  NicheContext,
  NicheAssessment,
  NicheCalibration,
  NicheOutcome,
  SynRequest,
  SynResolution,
  SynDocument,
  ArrowMap,
  StatuNode,
  Arrow
} from "../src/index.js";
import { isSynRequest, isSynResolution } from "../src/index.js";

// ---------- niche types ----------

describe("niche types", () => {
  it("constructs a valid NicheManifest object", () => {
    const manifest: NicheManifest = {
      niche_version: "1.0",
      id: "niche:my-project-v1",
      declared_position: {
        project_name: "my-project",
        purpose: "Build a delightful CLI for agent development",
        does: ["implement features", "write tests"],
        does_not: ["deploy to production without human approval"]
      },
      strategic_bets: ["TypeScript-first", "YAML-first"],
      success_signals: ["tests passing", "docs complete"],
      relevant_signals: ["api:contract-changed"],
      evidence_window_days: 30,
      drift_thresholds: {
        task_drift: 0.25,
        collaboration_drift: 0.2,
        boundary_drift: 0.1
      },
      syn_policy: {
        auto_trigger: true,
        required_approvers: ["@alice"]
      }
    };

    expect(manifest.niche_version).toBe("1.0");
    expect(manifest.declared_position.project_name).toBe("my-project");
    expect(manifest.declared_position.does.length).toBeGreaterThan(0);
    expect(manifest.declared_position.does_not.length).toBeGreaterThan(0);
  });

  it("round-trips a NicheManifest through YAML", () => {
    const manifest: NicheManifest = {
      niche_version: "1.0",
      declared_position: {
        project_name: "x",
        purpose: "y",
        does: ["build"],
        does_not: ["cheat"]
      }
    };
    const yaml = YAML.stringify(manifest);
    const parsed = YAML.parse(yaml) as NicheManifest;
    expect(parsed.niche_version).toBe("1.0");
    expect(parsed.declared_position.project_name).toBe("x");
  });

  it("constructs a valid NicheSignal object", () => {
    const signal: NicheSignal = {
      signal_version: "1.0",
      id: "sig-001",
      type: "api:contract-changed",
      source: "git-hook",
      timestamp: "2026-06-09T12:00:00Z",
      summary: "Backend API endpoint signature changed",
      details: {
        endpoint: "/api/v1/projects",
        change: "response shape updated",
        impact_level: "high",
        commit_ref: "abc123",
        file_paths: ["src/api.ts"]
      },
      related_signals: ["sig-002"]
    };
    expect(signal.id).toBe("sig-001");
    expect(signal.details?.impact_level).toBe("high");
  });

  it("constructs a valid NicheContext object", () => {
    const ctx: NicheContext = {
      context_version: "1.0",
      id: "ctx-001",
      from_agent: "frontend-agent",
      to_agent: "backend-agent",
      timestamp: "2026-06-09T12:00:00Z",
      summary: "Need review of API change",
      requested_action: "Review and approve API contract update",
      priority: "high"
    };
    expect(ctx.from_agent).toBe("frontend-agent");
    expect(ctx.priority).toBe("high");
  });

  it("constructs a valid NicheAssessment object", () => {
    const assessment: NicheAssessment = {
      assessment_version: "1.0",
      id: "ast-001",
      signal_id: "sig-001",
      assessor: "backend-agent",
      timestamp: "2026-06-09T12:00:00Z",
      relevance_score: 0.9,
      relevance_rational: "Affects our contract with the frontend",
      confidence: 0.85,
      impact_analysis: {
        affected_components: ["src/api.ts"],
        estimated_effort: "2 hours",
        priority: "high"
      },
      recommended_action: "Update API consumer code",
      will_act: true
    };
    expect(assessment.relevance_score).toBeGreaterThanOrEqual(0);
    expect(assessment.relevance_score).toBeLessThanOrEqual(1);
    expect(assessment.will_act).toBe(true);
  });

  it("constructs a valid NicheCalibration object", () => {
    const calibration: NicheCalibration = {
      calibration_version: "1.0",
      id: "cal-001",
      timestamp: "2026-06-09T12:00:00Z",
      evidence_window: {
        start: "2026-06-01T00:00:00Z",
        end: "2026-06-09T12:00:00Z"
      },
      drift_analysis: {
        task_drift: {
          metric: "unrelated_tasks_ratio",
          observed: 0.35,
          threshold: 0.25,
          description: "Agent working on out-of-scope tasks"
        },
        collaboration_drift: {
          metric: "unrelated_collaborations_ratio",
          observed: 0.15,
          threshold: 0.2,
          description: "Within expected range"
        },
        boundary_drift: {
          metric: "boundary_violations",
          observed: 0.15,
          threshold: 0.1,
          description: "Some boundary violations detected"
        }
      },
      proposed_change: {
        type: "update_declared_position",
        description: "Expand scope to include deployment tooling",
        rationale: "Project has grown beyond initial scope"
      },
      evidence: ["out-001", "out-002"],
      auto_triggers_syn: true
    };
    expect(calibration.drift_analysis.task_drift.observed).toBeGreaterThan(
      calibration.drift_analysis.task_drift.threshold
    );
  });

  it("constructs a valid NicheOutcome object", () => {
    const outcome: NicheOutcome = {
      outcome_version: "1.0",
      id: "out-001",
      context_id: "ctx-001",
      agent: "backend-agent",
      timestamp: "2026-06-09T12:00:00Z",
      result: "success",
      summary: "API review completed",
      details: {
        tests_passed: 42,
        tests_failed: 0,
        coverage_improved: true,
        new_tests_added: 5,
        test_report_url: "https://ci.example.com/report/123",
        files_changed: ["src/api.ts"]
      },
      next_steps: ["deploy to staging"],
      related_outcomes: ["out-002"]
    };
    expect(outcome.result).toBe("success");
    expect(outcome.details?.tests_failed).toBe(0);
  });
});

// ---------- SYN types ----------

describe("SYN types", () => {
  it("constructs a valid SynRequest object", () => {
    const request: SynRequest = {
      syn_version: "1.0",
      id: "syn-001",
      type: "human_decision_required",
      source: "calibration",
      calibration_id: "cal-001",
      timestamp: "2026-06-09T12:00:00Z",
      priority: "high",
      summary: "Should we expand scope to include deployment tooling?",
      context: {
        evidence_summary: "Multiple boundary violations detected",
        evidence_window: "2026-06-01 to 2026-06-09"
      },
      options: [
        {
          id: "opt-1",
          title: "Expand scope",
          description: "Add deployment tooling responsibilities",
          pros: ["Faster delivery", "Single team"],
          cons: ["Scope creep"]
        },
        {
          id: "opt-2",
          title: "Stay focused",
          description: "Keep current scope, defer deployment work",
          pros: ["Stays on mission"],
          cons: ["Slower deployment"]
        }
      ],
      recommendation: "opt-1",
      requested_decision_by: "2026-06-10T12:00:00Z"
    };

    expect(request.type).toBe("human_decision_required");
    expect(request.options.length).toBe(2);
    expect(request.priority).toBe("high");
  });

  it("constructs a valid SynResolution object", () => {
    const resolution: SynResolution = {
      syn_resolution_version: "1.0",
      id: "syn-001-resolution",
      syn_request_id: "syn-001",
      principal: "alice@example.com",
      timestamp: "2026-06-10T11:00:00Z",
      decision: "opt-1",
      decision_summary: "Approved expanding scope",
      rationale: "Deployment tooling is strategic for this project",
      effective_date: "2026-06-10T12:00:00Z",
      next_steps: ["Update niche manifest", "Notify team"],
      audit_trail: ["chat-log-123", "email-approval-456"]
    };
    expect(resolution.decision).toBe("opt-1");
    expect(resolution.audit_trail?.length).toBeGreaterThan(0);
  });

  it("type guards correctly differentiate SynRequest vs SynResolution", () => {
    const request: SynDocument = {
      syn_version: "1.0",
      id: "syn-001",
      type: "human_decision_required",
      source: "manual",
      timestamp: "2026-06-10T12:00:00Z",
      priority: "medium",
      summary: "Decision needed",
      options: [{ id: "a", title: "A", description: "Choice A" }],
      recommendation: "a"
    };

    const resolution: SynDocument = {
      syn_resolution_version: "1.0",
      id: "syn-001-resolution",
      syn_request_id: "syn-001",
      principal: "alice",
      timestamp: "2026-06-10T12:00:00Z",
      decision: "a",
      decision_summary: "Done",
      rationale: "Makes sense"
    };

    expect(isSynRequest(request)).toBe(true);
    expect(isSynResolution(request)).toBe(false);
    expect(isSynRequest(resolution)).toBe(false);
    expect(isSynResolution(resolution)).toBe(true);
  });
});

// ---------- Arrow Map types ----------

describe("Arrow Map types", () => {
  it("constructs a valid StatuNode object", () => {
    const node: StatuNode = {
      id: "frontend-service",
      type: "component:service",
      name: "Frontend Service",
      description: "Serves the user interface",
      properties: {
        _node_type_hint: "component:service",
        technology: "React",
        language: "TypeScript"
      },
      labels: ["frontend", "ui"],
      tags: ["public"],
      status: "active",
      metadata: {
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-06-09T12:00:00Z",
        created_by: "dev-agent",
        source: "manual"
      }
    };
    expect(node.id).toBe("frontend-service");
    expect(node.status).toBe("active");
  });

  it("constructs valid Arrow objects with different types", () => {
    const dependency: Arrow = {
      id: "arrow-001",
      source: "frontend-service",
      target: "backend-api",
      type: "dependency",
      description: "Frontend depends on backend API",
      properties: {
        reason: "API calls require backend service",
        criticality: "critical",
        weight: 0.9
      },
      type_properties: {
        dependency_type: "hard",
        failure_mode: "UI shows error"
      }
    };

    const infoFlow: Arrow = {
      id: "arrow-002",
      source: "event-bus",
      target: "frontend-service",
      type: "information_flow",
      type_properties: {
        direction: "bidirectional",
        information_type: "events",
        protocol: "WebSocket"
      }
    };

    const validation: Arrow = {
      id: "arrow-003",
      source: "qa-agent",
      target: "backend-api",
      type: "validation",
      type_properties: {
        validation_type: "test",
        required: true
      }
    };

    expect(dependency.type).toBe("dependency");
    expect(dependency.properties?.criticality).toBe("critical");
    expect(infoFlow.type).toBe("information_flow");
    expect(validation.type).toBe("validation");
  });

  it("constructs a valid ArrowMap object with nodes and arrows", () => {
    const nodes: StatuNode[] = [
      { id: "frontend", type: "component:service", name: "Frontend" },
      { id: "backend", type: "component:service", name: "Backend" },
      { id: "database", type: "component:database", name: "Database" }
    ];

    const arrows: Arrow[] = [
      {
        id: "a1",
        source: "frontend",
        target: "backend",
        type: "dependency",
        properties: { criticality: "critical", weight: 0.9 }
      },
      {
        id: "a2",
        source: "backend",
        target: "database",
        type: "information_flow",
        type_properties: {
          direction: "bidirectional",
          information_type: "queries"
        }
      }
    ];

    const map: ArrowMap = {
      arrow_map_version: "0.1.0",
      id: "niche:my-project-topology-v1",
      name: "My Project Topology",
      description: "Describes relationships between project components",
      niche_category: "microservice-backend",
      version: "1.0.0",
      status: "stable",
      nodes,
      arrows,
      namespaces: {
        statuz: "https://statuz.org/nodes/",
        local: "./"
      },
      invariants: [
        {
          description: "Frontend must not directly access database",
          severity: "error"
        }
      ],
      templates: [
        {
          name: "environment",
          description: "Deployment environment",
          default: "staging",
          required: false
        }
      ],
      extends: [
        { map_id: "niche:base-topology-v1", version: "2.0.0" }
      ],
      storage: {
        canonical_path: ".statuz/arrow-maps/my-project.yaml",
        registry: "statuz.org",
        local_cache: ".cache/arrow-maps/"
      },
      metadata: {
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-06-09T12:00:00Z",
        author: "dev-team",
        organization: "Example Company",
        license: "Apache-2.0",
        source_url: "https://github.com/example/my-project"
      }
    };

    expect(map.nodes.length).toBe(3);
    expect(map.arrows.length).toBe(2);
    expect(map.status).toBe("stable");
    expect(map.invariants?.[0].description.length).toBeGreaterThan(0);
  });

  it("round-trips an ArrowMap through YAML serialization", () => {
    const map: ArrowMap = {
      arrow_map_version: "0.1.0",
      id: "test-map",
      nodes: [
        { id: "n1", type: "component" },
        { id: "n2", type: "component" }
      ],
      arrows: [
        { id: "a1", source: "n1", target: "n2", type: "dependency" }
      ]
    };

    const yaml = YAML.stringify(map);
    const parsed = YAML.parse(yaml) as ArrowMap;
    expect(parsed.id).toBe("test-map");
    expect(parsed.nodes.length).toBe(2);
    expect(parsed.arrows.length).toBe(1);
    expect(parsed.arrows[0].type).toBe("dependency");
  });
});
