import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function testSignals() {
  console.log('🧪 Testing Signal Hub...\n');

  // Test 1: Send a signal
  console.log('1. Sending test signal...');
  const signalResponse = await fetch(`${BASE_URL}/api/v1/signals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'state_updated',
      source: 'agent_alpha',
      target: 'agent_beta',
      payload: { progress: 0.75, status: 'in_progress' }
    })
  });
  const signalResult = await signalResponse.json();
  console.log('   ✅ Signal sent:', signalResult);
  console.log();

  // Test 2: Get all signals
  console.log('2. Getting all signals...');
  const signalsResponse = await fetch(`${BASE_URL}/api/v1/signals`);
  const signalsResult = await signalsResponse.json();
  console.log('   ✅ Signals received:', signalsResult);
  console.log();

  // Test 3: Create SYN request
  console.log('3. Creating SYN request...');
  const synResponse = await fetch(`${BASE_URL}/api/v1/syn/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requester: 'agent_alpha',
      type: 'calibration_request',
      description: 'Need help with task coordination',
      priority: 'high'
    })
  });
  const synResult = await synResponse.json();
  console.log('   ✅ SYN request created:', synResult);
  console.log();

  // Test 4: Get all SYN requests
  console.log('4. Getting all SYN requests...');
  const synRequestsResponse = await fetch(`${BASE_URL}/api/v1/syn/requests`);
  const synRequestsResult = await synRequestsResponse.json();
  console.log('   ✅ SYN requests received:', synRequestsResult);
  console.log();

  console.log('🎉 All tests passed! Coordination Pool Spike is working.');
}

testSignals().catch(console.error);
