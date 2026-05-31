# Coordination Pool SDK Integration Examples

This document shows how to use the Coordination Pool integration in both TypeScript and Python SDKs.

## Prerequisites

1. Start the Coordination Pool server:
```bash
cd packages/coordination
npm install
npm run dev
```

## TypeScript SDK Example

```typescript
import { Statuz, CoordinationClient } from "@statuz/sdk-ts";

// Create a CoordinationClient
const client = new CoordinationClient("http://localhost:3000");

// Create a Statuz instance
const statuz = Statuz.create("my-agent", "my-project");

// Send a signal when state changes
async function updateStateAndNotify() {
  // Update local state
  statuz.currentState = {
    stage: "processing",
    task: "Analyzing data",
    status: "in_progress",
    last_checkpoint: "Started data analysis",
    next_action: "Continue with feature extraction"
  };

  // Send signal to Coordination Pool
  const signal = await client.sendSignal({
    type: "state_updated",
    source: statuz.identity.agent_name,
    payload: {
      stage: statuz.currentState.stage,
      status: statuz.currentState.status
    }
  });

  console.log("Signal sent:", signal.id);
}

// Add a checkpoint and notify
async function addCheckpointAndNotify() {
  const checkpoint = statuz.appendCheckpoint(
    "Completed data preprocessing",
    "Start model training"
  );

  // Send checkpoint signal
  await client.sendSignal({
    type: "checkpoint_added",
    source: statuz.identity.agent_name,
    payload: {
      checkpoint_id: checkpoint.id,
      summary: checkpoint.summary
    }
  });
}

// Request human approval
async function requestApproval() {
  const synRequest = await client.createSynRequest({
    requester: statuz.identity.agent_name,
    type: "model_deployment",
    description: "Request approval to deploy trained model to production",
    priority: "high"
  });

  console.log("Approval request created:", synRequest.id);
}

// Poll for signals from other agents
async function pollForSignals() {
  const signals = await client.getSignals();
  const relevantSignals = signals.filter(
    s => s.target === statuz.identity.agent_name
  );

  console.log("Received signals:", relevantSignals);
}
```

## Python SDK Example

```python
from statuz import Statuz, CoordinationClient, Signal, SynRequest

# Create a CoordinationClient
client = CoordinationClient("http://localhost:3000")

# Create a Statuz instance
statuz = Statuz.create("my-agent-py", "my-project")

# Send a signal when state changes
def update_state_and_notify():
    # Update local state
    statuz.current_state = CurrentState(
        stage="processing",
        task="Analyzing data",
        status="in_progress",
        last_checkpoint="Started data analysis",
        next_action="Continue with feature extraction"
    )

    # Send signal to Coordination Pool
    signal = Signal(
        type="state_updated",
        source=statuz.identity.agent_name,
        payload={
            "stage": statuz.current_state.stage,
            "status": statuz.current_state.status
        }
    )
    sent_signal = client.send_signal(signal)

    print("Signal sent:", sent_signal.id)

# Add a checkpoint and notify
def add_checkpoint_and_notify():
    checkpoint = statuz.append_checkpoint(
        "Completed data preprocessing",
        "Start model training"
    )

    # Send checkpoint signal
    signal = Signal(
        type="checkpoint_added",
        source=statuz.identity.agent_name,
        payload={
            "checkpoint_id": checkpoint.id,
            "summary": checkpoint.summary
        }
    )
    client.send_signal(signal)

# Request human approval
def request_approval():
    syn_request = SynRequest(
        requester=statuz.identity.agent_name,
        type="model_deployment",
        description="Request approval to deploy trained model to production",
        priority="high"
    )
    created_request = client.create_syn_request(syn_request)

    print("Approval request created:", created_request.id)

# Poll for signals from other agents
def poll_for_signals():
    signals = client.get_signals()
    relevant_signals = [
        s for s in signals
        if s.target == statuz.identity.agent_name
    ]

    print("Received signals:", relevant_signals)
```

## Multi-Agent Coordination Example

Here's how two agents can coordinate using the Coordination Pool:

### Agent A (TypeScript)
```typescript
import { Statuz, CoordinationClient } from "@statuz/sdk-ts";

const client = new CoordinationClient();
const agentA = Statuz.create("agent-a", "shared-project");

// Agent A completes a task and notifies Agent B
async function completeTaskAndNotify() {
  agentA.appendCheckpoint("Data preparation complete", "Wait for Agent B");

  await client.sendSignal({
    type: "task_completed",
    source: "agent-a",
    target: "agent-b",
    payload: {
      task: "data_prep",
      output_path: "/data/processed/dataset.csv"
    }
  });
}
```

### Agent B (Python)
```python
from statuz import Statuz, CoordinationClient, Signal

client = CoordinationClient()
agentB = Statuz.create("agent-b", "shared-project")

# Agent B listens for signals from Agent A
async def wait_for_signal():
    while True:
        signals = client.get_signals()
        for signal in signals:
            if (signal.type == "task_completed" and
                signal.source == "agent-a" and
                signal.target == "agent-b"):

                # Start processing
                agentB.current_state = CurrentState(
                    stage="processing",
                    task="Train model with data from Agent A",
                    status="in_progress",
                    last_checkpoint=f"Received data from Agent A: {signal.payload['output_path']}",
                    next_action="Start training"
                )
                return
        await asyncio.sleep(5)  # Poll every 5 seconds
```

## Key Concepts

1. **File-First Principle**: The Coordination Pool is optional. Statuz still works perfectly without it, using only local files.

2. **Optional Enhancement**: Coordination Pool provides cross-machine communication capabilities when needed.

3. **Backward Compatible**: Existing code continues to work without modification.

4. **Simple API**: The CoordinationClient provides a straightforward interface for common coordination patterns.
