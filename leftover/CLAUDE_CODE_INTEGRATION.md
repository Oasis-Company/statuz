# Claude Code Integration Guide

> How AI agents achieve situated alignment through the Statuz Protocol

---

## The Problem We Solve

Claude Code is a powerful AI coding assistant that helps developers build software. However, there's a fundamental challenge: **how does Claude Code maintain context and continuity across sessions?**

Traditional approaches rely on:

- Long conversation histories that are slow to process
- External memory systems that require complex setup
- Manual context passing between sessions

Statuz provides a **protocol-native solution** that makes agent continuity simple, portable, and human-inspectable.

---

## What Problems Does Statuz Solve for Claude Code Users?

### 1. Session Continuity Without Chat History

**Pain Point**: Claude Code forgets what it was working on when restarted.

**Statuz Solution**: A `statuz.yaml` file records runtime state:

```yaml
current_state: implementing_user_authentication
progress:
  completed:
    - Database schema design
    - API endpoints for users
  current: Building login flow
  next:
    - Password reset functionality
    - Email verification
```

Claude Code can read this file in seconds instead of parsing thousands of chat messages.

### 2. Human Oversight Without Micromanagement

**Pain Point**: Developers want to know what the AI is doing without constantly asking.

**Statuz Solution**: `niche` signals communicate status without flooding chat:

```yaml
niche:
  signals:
    - type: complexity_alert
      message: "Authentication module grew beyond initial scope"
      severity: warning
    - type: blocker
      message: "Third-party API rate limit exceeded"
      severity: critical
```

### 3. Cross-Project Coordination

**Pain Point**: Multiple AI agents working on related projects don't know about each other.

**Statuz Solution**: The SYN layer enables agents to negotiate shared goals:

```yaml
relations:
  - name: frontend-agent
    role: sibling
    sync_channel: frontend-status
  - name: backend-api
    role: parent
    sync_channel: api-contracts
```

---

## New Paradigms Introduced

### Paradigm 1: Situated Development

Traditional development has the human at the center, with the AI as a tool. Statuz introduces **situated development** where:

- The AI has a clear role and context
- Progress is visible and measurable
- The human can inspect and redirect at any time

### Paradigm 2: Checkpoint-Based Sessions

Instead of continuous conversation, Statuz enables **checkpoint-based sessions**:

```
Session Start → Read statuz.yaml → Work → Checkpoint → Session End
```

Each session starts by understanding the current state and ends by recording progress.

### Paradigm 3: Agent Ecosystems

Multiple AI agents can work together through the SYN protocol:

```
┌─────────────┐     SYN      ┌─────────────┐
│  Agent A    │◄────────────►│  Agent B    │
│  (Frontend) │   negotiate  │  (Backend)  │
└─────────────┘              └─────────────┘
      │                             │
      └──────────►◄─────────────────┘
           shared statuz.yaml
```

---

## Complete Usage Flow

### Step 1: Initialize a Project

```bash
cd my-project
npx @statuz/cli init
```

This creates `statuz.yaml` with:

```yaml
statuz_version: "0.1"
updated_at: "2026-06-02T10:00:00Z"
identity:
  name: project-assistant
  version: "1.0.0"
role:
  type: assistant
  description: "AI assistant for this project"
goal:
  summary: "Build a modern web application"
  target: "Production-ready MVP"
current_state: initialized
progress:
  completed: []
  current: Project initialization
  next:
    - Architecture design
    - Core features
```

### Step 2: Start a Claude Code Session

When Claude Code starts, it reads `statuz.yaml` to understand context:

```
✓ Loaded statuz.yaml
✓ Project: Modern Web App
✓ Current State: initialized
✓ Next Tasks: Architecture design, Core features
```

### Step 3: Work and Create Checkpoints

During development, create checkpoints to save progress:

```bash
npx @statuz/cli checkpoint --message "Completed user authentication module"
```

This updates `statuz.yaml`:

```yaml
current_state: implementing_api_endpoints
progress:
  completed:
    - Project initialization
    - User authentication module
  current: Building REST API
  next:
    - Database integration
    - Frontend components
checkpoints:
  - timestamp: "2026-06-02T11:30:00Z"
    message: "Completed user authentication module"
    state: implementing_api_endpoints
```

### Step 4: Emit Niche Signals

When the AI encounters issues that need human attention:

```bash
npx @statuz/cli signal --type complexity_alert --message "Auth module complexity increased"
```

### Step 5: Coordinate with Other Agents (SYN Protocol)

For multi-agent projects, agents can negotiate:

```bash
# Agent A requests coordination
npx @statuz/cli syn request --to backend-agent --type contract_ negotiation --payload '{"endpoint": "/api/users", "method": "POST"}'

# Agent B responds
npx @statuz/cli syn respond --request-id req_xxx --accepted true
```

---

## Configuration for Claude Code

Add this to your Claude Code configuration (`~/.claude/settings.json`):

```json
{
  "statuz": {
    "enabled": true,
    "autoCheckpoint": true,
    "checkpointInterval": "30m",
    "signals": {
      "complexity_alert": true,
      "blocker": true,
      "success": true
    }
  }
}
```

---

## Integration Points

### VS Code Extension

The Statuz VS Code Extension provides:

- **Status Bar**: Shows current state at a glance
- **Quick Commands**: Checkpoint, signal, validate
- **Syntax Highlighting**: For `statuz.yaml` files
- **Preview Panel**: Human-readable status display

### Coordination Pool (Cloud)

For team environments, deploy the Coordination Pool:

```bash
cd packages/coordination
docker-compose up -d
```

This enables:

- Real-time signal broadcasting
- SYN request routing
- Cross-project visibility

---

## Comparison with Alternatives

| Feature | Statuz | Chat History | External Memory |
|---------|--------|--------------|-----------------|
| Speed to understand context | Fast (YAML) | Slow (parsing) | Medium |
| Human readability | Excellent | Poor | Medium |
| Portable | Yes (single file) | No | Yes |
| Multi-agent coordination | Native | No | Complex |
| Setup complexity | Low | None | High |

---

## Getting Started Checklist

- [ ] Install: `npm install -g @statuz/cli`
- [ ] Initialize: `npx @statuz/cli init`
- [ ] Validate: `npx @statuz/cli validate`
- [ ] Install VS Code Extension (optional)
- [ ] Read SPEC.md for protocol details

---

## Next Steps

1. **[SPEC.md](SPEC.md)** - Understand the protocol specification
2. **[ADAPTERS.md](ADAPTERS.md)** - Explore available tools and integrations
3. **[examples/](examples/)** - Copy-paste ready templates

---

## Philosophy

> "Statuz records the current runtime state of an AI agent. It is not memory—it is status. Not what the agent knows, but what the agent is doing."

The Statuz Protocol makes AI development:

- **Transparent**: Humans can always see what the AI is doing
- **Continuous**: Sessions connect through checkpoint files
- **Coordinated**: Multiple agents can work together
- **Portable**: No vendor lock-in, pure protocol

---

*Last updated: 2026-06-02*
