import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from statuz import CoordinationClient, Signal, SynRequest, Statuz


def test_python_sdk_integration():
    print("🧪 Testing Python SDK Integration with Coordination Pool\n")

    # 1. Test CoordinationClient
    print("1. Testing CoordinationClient...")
    client = CoordinationClient("http://localhost:3000")

    # Send a signal
    signal = Signal(
        type="test_signal_py",
        source="test-agent-py",
        target="test-agent-ts",
        payload={"message": "Hello from Python!", "timestamp": 1234567890}
    )
    sent_signal = client.send_signal(signal)
    print(f"   ✅ Sent signal: {sent_signal.id}")

    # Get all signals
    signals = client.get_signals()
    print(f"   ✅ Retrieved {len(signals)} signals")

    # Create SYN request
    syn_request = SynRequest(
        requester="test-agent-py",
        type="test_request_py",
        description="Test request from Python SDK",
        priority="high"
    )
    created_request = client.create_syn_request(syn_request)
    print(f"   ✅ Created SYN request: {created_request.id}")

    # Get all SYN requests
    syn_requests_list = client.get_syn_requests()
    print(f"   ✅ Retrieved {len(syn_requests_list)} SYN requests\n")

    # 2. Test integration with Statuz
    print("2. Testing integration with Statuz...")
    statuz = Statuz.create("test-agent-py", "test-project")
    print("   ✅ Created Statuz instance")

    # Send a state update signal
    state_signal = Signal(
        type="state_updated",
        source=statuz.identity.agent_name,
        payload={
            "stage": statuz.current_state.stage,
            "status": statuz.current_state.status,
            "last_checkpoint": statuz.current_state.last_checkpoint
        }
    )
    sent_state_signal = client.send_signal(state_signal)
    print(f"   ✅ Sent state update signal: {sent_state_signal.id}")

    # Append checkpoint and send signal
    checkpoint = statuz.append_checkpoint(
        "Tested Coordination Pool integration",
        "Continue with testing"
    )
    checkpoint_signal = Signal(
        type="checkpoint_added",
        source=statuz.identity.agent_name,
        payload={
            "checkpoint_id": checkpoint.id,
            "summary": checkpoint.summary
        }
    )
    sent_checkpoint_signal = client.send_signal(checkpoint_signal)
    print(f"   ✅ Sent checkpoint signal: {sent_checkpoint_signal.id}")

    print("\n🎉 All Python SDK integration tests passed!")


if __name__ == "__main__":
    test_python_sdk_integration()
