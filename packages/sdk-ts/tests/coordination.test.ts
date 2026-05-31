import { CoordinationClient, Statuz } from "../src/index.js";

async function testTypeScriptSDKIntegration() {
  console.log("🧪 Testing TypeScript SDK Integration with Coordination Pool\n");

  // 1. Test CoordinationClient
  console.log("1. Testing CoordinationClient...");
  const client = new CoordinationClient("http://localhost:3000");

  // Send a signal
  const signal = await client.sendSignal({
    type: "test_signal",
    source: "test-agent-ts",
    target: "test-agent-py",
    payload: { message: "Hello from TypeScript!", timestamp: Date.now() }
  });
  console.log("   ✅ Sent signal:", signal.id);

  // Get all signals
  const signals = await client.getSignals();
  console.log(`   ✅ Retrieved ${signals.length} signals`);

  // Create SYN request
  const synRequest = await client.createSynRequest({
    requester: "test-agent-ts",
    type: "test_request",
    description: "Test request from TypeScript SDK",
    priority: "medium"
  });
  console.log("   ✅ Created SYN request:", synRequest.id);

  // Get all SYN requests
  const synRequests = await client.getSynRequests();
  console.log(`   ✅ Retrieved ${synRequests.length} SYN requests\n`);

  // 2. Test integration with Statuz
  console.log("2. Testing integration with Statuz...");
  const statuz = Statuz.create("test-agent-ts", "test-project");
  console.log("   ✅ Created Statuz instance");

  // Send a state update signal
  const stateSignal = await client.sendSignal({
    type: "state_updated",
    source: statuz.identity.agent_name,
    payload: {
      stage: statuz.currentState.stage,
      status: statuz.currentState.status,
      last_checkpoint: statuz.currentState.last_checkpoint
    }
  });
  console.log("   ✅ Sent state update signal:", stateSignal.id);

  // Append checkpoint and send signal
  const checkpoint = statuz.appendCheckpoint(
    "Tested Coordination Pool integration",
    "Continue with testing"
  );
  const checkpointSignal = await client.sendSignal({
    type: "checkpoint_added",
    source: statuz.identity.agent_name,
    payload: {
      checkpoint_id: checkpoint.id,
      summary: checkpoint.summary
    }
  });
  console.log("   ✅ Sent checkpoint signal:", checkpointSignal.id);

  console.log("\n🎉 All TypeScript SDK integration tests passed!");
}

testTypeScriptSDKIntegration().catch(console.error);
