# Next Step Execution Plan

> **Status:** Working Draft  
> **Target:** Small team or individual contributors working in sequence  
> **Language:** English for code/docs, Chinese for internal discussion  
> **Last updated:** 2026-06-04

---

## Where We Are Now (Snapshot)

```
Protocol Layer:    ████████████████ 100%   Core + niche + SYN + Pending Actions schemas
Core Tools:        ████████████████ 100%   CLI / SDK-TS / SDK-PY / MCP Server shipped
Examples:          ████████████████ 100%   niche (23/23) + SYN (22/22) + Pending Actions (7/7)
VS Code Extension: ████░░░░░░░░░░░░  25%   Skeleton exists, none of the niche/SYN UI
niche Runtime:     ██░░░░░░░░░░░░░░   5%   Pending Actions schema + fixtures verified
SYN Workflow:      ██░░░░░░░░░░░░░░   0%   Schemas only, no engine
Conformance:       ███░░░░░░░░░░░░░  25%   Pending Actions fixtures + validation done
```

**The hard truth:** niche and SYN are real on paper but dead in code. We have beautiful schemas and 45+ validated example files, but no engine that actually watches changes, judges relevance, or presents decisions to humans.

### Recently Delivered: Pending Actions (2026-06-04) ✅

- ✅ `spec/pending-actions.schema.json` — JSON Schema
- ✅ `docs/PENDING_ACTIONS.md` — Full specification with agent behavior contract
- ✅ `docs/adr/0006-pending-actions.md` — Architecture Decision Record
- ✅ `spec/fixtures/valid/` — 2 valid fixtures (minimal, full with 7 actions)
- ✅ `spec/fixtures/invalid/` — 5 invalid fixtures (wrong version, bad id, missing status, bad status, empty array edge case)
- ✅ `packages/cli/validate-pending-actions.mjs` — Validation script
- ✅ **Closed-loop verification: 7/7 passed** (valid fixtures validated, invalid fixtures correctly rejected)

> **Agent contract:** Agent MUST read `.statuz/pending-actions.yaml` before initializing any external service or making assumptions about human-completed prerequisites.

---

## Phase A: VS Code Extension — The Human Interface

**Why first:** niche/SYN have no value if humans can't see them. The VS Code extension is the primary surface where developers interact with Statuz.

### A.1 — Syntax Highlighting & Validation

| Task | What | Acceptance |
|------|------|------------|
| A.1.1 | `.statuz/*.yaml` syntax highlighting (TM Grammar) | Editor highlights keys/values correctly |
| A.1.2 | `.statuz/*.json` schema association | Editor validates against correct schema |
| A.1.3 | Real-time validation on save | Red squiggles on invalid YAML/JSON |
| A.1.4 | Quick-fix for common schema errors | "Add missing field X" action |

### A.2 — Niche Status Panel (Tree View)

| Task | What | Acceptance |
|------|------|------------|
| A.2.1 | File watcher on `.statuz/niche/` directory | Auto-refresh when files change |
| A.2.2 | Tree view: manifests → signals → assessments → outcomes | One click to expand/collapse each level |
| A.2.3 | Inline signal severity icons (info/warning/critical) | Color-coded, immediately visible |
| A.2.4 | Click a signal → open assessment | Quick drill-down |
| A.2.5 | Click a manifest → show declared niche vs observed drift | Side-by-side comparison |

### A.3 — SYN Decision Webview

| Task | What | Acceptance |
|------|------|------------|
| A.3.1 | Detect `.statuz/niche/syn-requests/` files | Badge counter on status bar |
| A.3.2 | Webview: SYN request detail (evidence, options, risks) | Readable, not raw YAML dump |
| A.3.3 | Accept/Reject/Defer buttons → writes SYN resolution file | One-click decision |
| A.3.4 | "Ask me later" snooze with configurable interval | Doesn't re-prompt for N hours |
| A.3.5 | SYN history view | See past decisions and their outcomes |

### A.4 — VCS Signal Auto-Generation (Optional but high value)

| Task | What | Acceptance |
|------|------|------------|
| A.4.1 | Git post-commit hook → generate niche signal | Signal YAML appears on commit |
| A.4.2 | Detect file patterns from manifest responsibilities | e.g. `src/auth/*` changed → relevant |
| A.4.3 | Configurable signal templates | User can customize auto-generated signal format |

### A.5 — Quick Commands

| Task | What | Acceptance |
|------|------|------------|
| A.5.1 | `Statuz: Initialize` → creates `.statuz/statuz.yaml` | Works from command palette |
| A.5.2 | `Statuz: Initialize Niche` → creates `.statuz/niche/manifest.yaml` | Works from command palette |
| A.5.3 | `Statuz: Validate All` → validates all Statuz files in workspace | Shows problems panel |
| A.5.4 | `Statuz: Resume` → shows current state summary | Side panel with next actions |

---

## Phase B: Niche Runtime Engine

**Why second:** The schemas exist but nothing watches the world and generates signals/assessments automatically. Without this, niche is just static config.

### B.1 — Signal Generator

| Task | What | Acceptance |
|------|------|------------|
| B.1.1 | Git watcher: detect commits, branch changes, merge conflicts | Signal YAML generated on each event |
| B.1.2 | File change classifier: maps changed paths to manifest responsibilities | Only relevant changes trigger signals |
| B.1.3 | Dependency watcher: detect `package.json` / `requirements.txt` / `Cargo.toml` changes | Signal when a dependency changes |
| B.1.4 | Configurable watcher rules per manifest | Project can tune what triggers signals |
| B.1.5 | Signal deduplication | Same change doesn't generate duplicate signals |

### B.2 — Assessment Engine

| Task | What | Acceptance |
|------|------|------------|
| B.2.1 | Match signal to manifest: "does this signal affect my declared responsibilities?" | Yes/No + reason |
| B.2.2 | Relevance scoring: 0–100 based on match strength | Threshold configurable per project |
| B.2.3 | Generate assessment: why relevant, suggested action, affected scope | Assessment YAML with explainable reasoning |
| B.2.4 | Auto-generate niche context for downstream agents | Minimal, necessary context (not full memory dump) |

### B.3 — Outcome Recorder

| Task | What | Acceptance |
|------|------|------------|
| B.3.1 | Record outcome after agent action | What was done, what changed, impact on local state |
| B.3.2 | Link outcome to parent signal + assessment | Traceable chain: signal → assessment → outcome |
| B.3.3 | Aggregate outcomes for calibration | Running summary of "what actually happened" |

### B.4 — Calibration Detector

| Task | What | Acceptance |
|------|------|------------|
| B.4.1 | Compare declared niche vs observed niche over time window | Drift metric |
| B.4.2 | Detect scope creep: agent doing things outside declared responsibilities | Flag when threshold exceeded |
| B.4.3 | Detect collaboration drift: working with new agents/projects not in manifest | Flag when threshold exceeded |
| B.4.4 | Generate calibration proposal with evidence + options | Calibration YAML, not auto-applied |
| B.4.5 | Calibration proposal → SYN trigger (if involves permissions/strategy) | Routes to Phase C |

---

## Phase C: SYN Workflow

**Why third:** SYN is the governance layer. It only makes sense when niche is generating real signals, assessments, and calibrations.

### C.1 — SYN Trigger Rules

| Task | What | Acceptance |
|------|------|------------|
| C.1.1 | Define SYN severity levels: CRITICAL / HIGH / MEDIUM / LOW | Documented with examples |
| C.1.2 | Auto-trigger SYN when calibration involves permissions, boundaries, or strategy | Spec-compliant |
| C.1.3 | Auto-trigger SYN when new capability/dependency/relationship forms | Spec-compliant |
| C.1.4 | Low-risk calibrations (routing preference, minor scope) do NOT trigger SYN | Auto-applied with log only |
| C.1.5 | SYN deduplication + batching: similar requests merged | Not a notification storm |

### C.2 — SYN Queue & Resolution

| Task | What | Acceptance |
|------|------|------------|
| C.2.1 | SYN request file format: evidence, options, risks, recommendation | Machine-verifiable, human-readable |
| C.2.2 | SYN resolution: accepted / rejected / deferred with rationale | Stored, traceable |
| C.2.3 | Resolution → apply changes to manifest / config | Approved changes take effect |
| C.2.4 | SYN history: all decisions preserved, rollbackable | Audit trail |
| C.2.5 | SYN frequency control: max N per day, snooze, focus mode | Configurable per project |

### C.3 — SYN in VS Code (ties back to Phase A.3)

| Task | What | Acceptance |
|------|------|------------|
| C.3.1 | Badge counter on status bar when pending SYN exist | Immediately visible |
| C.3.2 | SYN detail panel: evidence, diff, risk assessment | Not just raw YAML |
| C.3.3 | One-click approve / reject / defer | No CLI needed |
| C.3.4 | "Remind me tomorrow" defer option | Practical for busy devs |

---

## Phase D: Conformance & Quality

**Ongoing, parallel to A/B/C.** Makes sure all implementations behave the same way.

### D.1 — Shared Conformance Suite

| Task | What | Acceptance |
|------|------|------------|
| D.1.1 | Expand `spec/fixtures/valid/` with edge cases | 20+ valid fixtures covering all object types |
| D.1.2 | Expand `spec/fixtures/invalid/` with error cases | 20+ invalid fixtures covering common mistakes |
| D.1.3 | Conformance test runner: same fixtures → same verdict across CLI, TS SDK, PY SDK, MCP | Automated, in CI |
| D.1.4 | Add niche/SYN fixtures to conformance suite | Cover all 7 schemas |

### D.2 — MCP Server Audit

| Task | What | Acceptance |
|------|------|------------|
| D.2.1 | Audit actual tool list vs documented tool list | Zero mismatches |
| D.2.2 | Mark each tool as stable / experimental / internal | Documented |
| D.2.3 | Security boundary tests: reject paths outside workspace root | Automated test |
| D.2.4 | Security boundary tests: reject sensitive paths (`.env`, `.git/config`, etc.) | Automated test |

### D.3 — CI Pipeline

| Task | What | Acceptance |
|------|------|------------|
| D.3.1 | CLI: build + test on push | GitHub Actions |
| D.3.2 | SDK-TS: build + test on push | GitHub Actions |
| D.3.3 | SDK-PY: install + test on push | GitHub Actions |
| D.3.4 | MCP Server: build + security test on push | GitHub Actions |
| D.3.5 | VS Code Extension: package on push | GitHub Actions |
| D.3.6 | Conformance suite: cross-impl on push | GitHub Actions |

---

## Phase E: 1.0 Ship

**The stabilization phase.** After A/B/C/D are substantially done.

### E.1 — Protocol Versioning

| Task | What | Acceptance |
|------|------|------------|
| E.1.1 | SPEC.md formal 1.0 version | Tagged, published |
| E.1.2 | Breaking Change Policy documented | Clear rules for what constitutes breaking |
| E.1.3 | Version compatibility matrix | Which implementations support which spec versions |

### E.2 — Migration

| Task | What | Acceptance |
|------|------|------------|
| E.2.1 | 0.x → 1.0 migration guide | Step-by-step, with before/after examples |
| E.2.2 | All examples updated to 1.0 | Remove deprecated patterns |
| E.2.3 | Schema migration scripts (if needed) | Automated upgrade tool |

### E.3 — Security Model

| Task | What | Acceptance |
|------|------|------------|
| E.3.1 | Formal security model document | Threat model, trust boundaries, mitigation |
| E.3.2 | Sensitive data tagging: what must NEVER be in Statuz files | Documented, enforced by validation |
| E.3.3 | File access permission guide | Best practices for multi-user/multi-agent scenarios |

### E.4 — Publishing & Launch

| Task | What | Acceptance |
|------|------|------------|
| E.4.1 | npm publish all packages at 1.0 | All four packages on npm |
| E.4.2 | Open VSX publish VS Code extension at 1.0 | Available for install |
| E.4.3 | VS Code Marketplace publish | Available for install |
| E.4.4 | Landing page / docs site update | Reflects 1.0 status |
| E.4.5 | "Getting Started in 5 Minutes" guide | New user can try Core immediately |

---

## What We're NOT Doing (Yet)

These are explicitly deferred — mentioned in the vision doc and ADAPTERS.md but not on the critical path:

| Item | Reason |
|------|--------|
| Web Dashboard | Semantics not stable enough; VS Code is the right first UI |
| A2A Transport Implementation | niche context can be expressed in A2A later; don't build transport ourselves |
| JetBrains Plugin | VS Code first, then expand based on demand |
| GitHub Actions / Slack Bot | After protocol + VS Code are solid |
| Large-scale Framework Adapters | After 1.0, when semantics are stable |
| Cross-Organization Trust Model | Premature without real-world adoption data |
| Automated Calibration Engine (full) | Start with detection + proposal; full auto-calibration needs trust model |
| New Agent-Side Intelligence | We're building tools for agents to express status, not a new agent framework |

---

## Execution Order & Dependencies

```
Phase A (VS Code Extension)
    ├── A.1 (Syntax) ─────────── can start immediately
    ├── A.2 (Niche Panel) ────── needs A.1
    ├── A.3 (SYN Webview) ────── needs A.2, Phase C for content
    ├── A.4 (VCS Signals) ────── needs Phase B.1
    └── A.5 (Commands) ──────── can start immediately

Phase B (niche Runtime)
    ├── B.1 (Signal Gen) ─────── can start immediately
    ├── B.2 (Assessment) ────── needs B.1
    ├── B.3 (Outcomes) ──────── needs B.2
    └── B.4 (Calibration) ───── needs B.3

Phase C (SYN Workflow)
    ├── C.1 (Triggers) ──────── needs B.4
    ├── C.2 (Queue) ─────────── needs C.1
    └── C.3 (VS Code UI) ────── needs A.3 + C.2

Phase D (Conformance) ──────── parallel, any time
Phase E (1.0) ─────────────── after A+B+C+D substantially done
```

**Recommended sprint order (for a small team):**

1. **Week 1–2:** A.1 + A.5 (get basic VS Code extension working)
2. **Week 2–3:** B.1 (signal generator — git watcher)
3. **Week 3–4:** B.2 + A.2 (assessment engine + niche panel)
4. **Week 4–5:** B.3 + B.4 (outcomes + calibration detection)
5. **Week 5–6:** C.1 + C.2 (SYN triggers + queue)
6. **Week 6–7:** A.3 + C.3 (SYN webview — the crowning feature)
7. **Week 7–8:** D (conformance + CI cleanup)
8. **Week 8–9:** E (1.0 stabilization + ship)

---

## For the Next Agent

When you pick up this work:

1. **Read this file first.**
2. **Read `statuz新构想.md`** for the philosophical grounding.
3. **Read `ROADMAP.md`** to see what's already checked off.
4. **Check `packages/vscode-extension/`** — the skeleton is there, it builds, it produces a `.vsix`. Start from that.
5. **Check `packages/coordination/`** — the signal/SYN REST API exists. The runtime engine (Phase B) should write to the same file formats the coordination pool reads.
6. **Use `spec/niche/*.schema.json`** as your contract — the runtime engine must produce output that validates against these schemas.
7. **Use `examples/niche-example/`** as your reference — the demo shows the complete chain. Your engine should automate what the demo shows manually.
8. **Keep Core simple** — do not add niche/SYN fields to `statuz.yaml`. They live in `.statuz/niche/`.
9. **All new code = TypeScript** (consistent with existing packages).
10. **Write your own working memory note** when you finish a meaningful chunk.

### Key Files to Know

```
Statuz Protocol Specification    → SPEC.md
Project Vision (Chinese)          → statuz新构想.md
Development Rules for Agents      → AGENTS.md
JSON Schemas (contract)           → spec/niche/*.schema.json
Reference Examples                → examples/niche-example/
VS Code Extension (start here)    → packages/vscode-extension/src/
Coordination Pool (REST API)      → packages/coordination/src/
```

---

*This plan is a living document. If you discover a better order, update it. If a task turns out to be harder than expected, split it. The goal is not to follow the plan blindly — it's to ship niche and SYN as real, working features.*
