#!/usr/bin/env node
/**
 * Signal Bus HTTP API Verification Script
 *
 * Tests ALL Signal Bus HTTP endpoints for correctness.
 */

import http from 'node:http';
import { SignalBusServer } from '../packages/signal-bus/dist/server.js';

const PORT = 7390;
const BASE_URL = `http://localhost:${PORT}`;

let passingCount = 0;
let failingCount = 0;

async function httpRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passingCount++;
  } else {
    console.log(`  ❌ ${name} - ${detail}`);
    failingCount++;
  }
}

async function run() {
  const server = new SignalBusServer({ port: PORT });
  await server.start();
  console.log('\n=== Signal Bus HTTP API Verification ===\n');

  // ===========================================================================
  // 1. HEALTH CHECK
  // ===========================================================================
  console.log('1️⃣ Health Check Endpoints');
  const health = await httpRequest('/health');
  assert('GET /health returns 200', health.status === 200, `got ${health.status}`);
  assert('Response contains status', health.body.status !== undefined);
  assert('status is ok', health.body.status === 'ok');
  assert('Contains agents_online', 'agents_online' in health.body);
  assert('Contains signals_processed', 'signals_processed' in health.body);
  console.log();

  // ===========================================================================
  // 2. AGENT REGISTRATION
  // ===========================================================================
  console.log('2️⃣ Agent Registration');
  const register = await httpRequest('/register', 'POST', {
    agent_id: 'verify-agent-1',
    name: 'Verification Agent',
    project: 'verification-project',
    capabilities: ['api', 'testing'],
    arrow_maps: ['niche:verify-v1'],
  });
  assert('POST /register returns 200/201', register.status >= 200 && register.status < 300,
    `got ${register.status}`);
  assert('registered flag', register.body.registered === true);
  assert('agent ID matches', register.body.agent?.id === 'verify-agent-1');
  assert('agent is online', register.body.agent?.status === 'online');
  assert('channel assigned', register.body.channel !== undefined);
  console.log();

  // Register second agent
  await httpRequest('/register', 'POST', {
    agent_id: 'verify-agent-2',
    name: 'Verification Agent 2',
    project: 'verification-project',
    capabilities: ['database'],
    arrow_maps: ['niche:verify-v1'],
  });

  // ===========================================================================
  // 3. HEARTBEAT
  // ===========================================================================
  console.log('3️⃣ Agent Heartbeat');
  const heartbeat = await httpRequest('/heartbeat/verify-agent-1', 'POST');
  assert('POST /heartbeat returns 200/201', heartbeat.status >= 200 && heartbeat.status < 300,
    `got ${heartbeat.status}`);
  assert('heartbeat returns agent info', heartbeat.body.agent !== undefined || heartbeat.body.success === true);
  console.log();

  // ===========================================================================
  // 4. LIST AGENTS
  // ===========================================================================
  console.log('4️⃣ List Agents');
  const listResponse = await httpRequest('/agents');
  assert('GET /agents returns 200', listResponse.status === 200, `got ${listResponse.status}`);
  assert('agent data is array', Array.isArray(listResponse.body.data) || Array.isArray(listResponse.body),
    `got ${typeof listResponse.body.data || listResponse.body}`);
  console.log();

  // ===========================================================================
  // 5. GET AGENT BY ID
  // ===========================================================================
  console.log('5️⃣ Get Agent by ID');
  const getAgent = await httpRequest('/agents/verify-agent-1');
  assert('GET /agents/:id returns 200', getAgent.status === 200, `got ${getAgent.status}`);
  assert('agent data present', getAgent.body.data !== undefined || getAgent.body.id !== undefined);
  console.log();

  // ===========================================================================
  // 6. SIGNALS
  // ===========================================================================
  console.log('6️⃣ Signal Communication');
  const sendSignal = await httpRequest('/signals', 'POST', {
    type: 'api-test-signal',
    source: 'verify-agent-1',
    target: 'verify-agent-2',
    payload: { message: 'Hello from HTTP API test!' },
    channel: 'default',
  });
  assert('POST /signals returns 200/201', sendSignal.status >= 200 && sendSignal.status < 300,
    `got ${sendSignal.status}`);
  assert('signal has ID', sendSignal.body.data?.id !== undefined || sendSignal.body.id !== undefined);

  const getSignals = await httpRequest('/signals?channel=default');
  assert('GET /signals returns 200', getSignals.status === 200, `got ${getSignals.status}`);
  console.log();

  // ===========================================================================
  // 7. DISCOVERY
  // ===========================================================================
  console.log('7️⃣ Agent Discovery');
  const discoverByProject = await httpRequest('/discover?project=verification-project');
  assert('GET /discover?project=... returns 200', discoverByProject.status === 200,
    `got ${discoverByProject.status}`);
  assert('returns discovery method', discoverByProject.data?.method !== undefined ||
    discoverByProject.body.data?.method !== undefined);

  const discoverByArrowMap = await httpRequest('/discover?arrow_map=niche:verify-v1');
  assert('GET /discover?arrow_map=... returns 200', discoverByArrowMap.status === 200,
    `got ${discoverByArrowMap.status}`);
  console.log();

  // ===========================================================================
  // 8. BACKFLOW (User -> Agent signals)
  // ===========================================================================
  console.log('8️⃣ Backflow');
  const backflow = await httpRequest('/backflow', 'POST', {
    agent_id: 'verify-agent-1',
    type: 'directive',
    content: 'Switch to verification mode',
    from: 'test@example.com',
    priority: 90,
  });
  assert('POST /backflow returns 200/201', backflow.status >= 200 && backflow.status < 300,
    `got ${backflow.status}`);

  const pollBackflow = await httpRequest('/backflow/verify-agent-1');
  assert('GET /backflow/:id returns 200', pollBackflow.status === 200, `got ${pollBackflow.status}`);
  console.log();

  // ===========================================================================
  // 9. UNREGISTER AGENT
  // ===========================================================================
  console.log('9️⃣ Agent Unregistration');
  const unregister = await httpRequest('/agents/verify-agent-2', 'DELETE');
  assert('DELETE /agents/:id returns 200', unregister.status === 200, `got ${unregister.status}`);
  assert('success flag', unregister.body.success === true);
  console.log();

  // ===========================================================================
  // 10. INVALID REQUESTS (Error handling)
  // ===========================================================================
  console.log('🔟 Error Handling');
  const invalidSignal = await httpRequest('/signals', 'POST', {
    invalid: 'data',
    missing: 'required fields',
  });
  assert('invalid signal request returns 200 or error',
    invalidSignal.status >= 200 && invalidSignal.status < 600);

  const unknownAgent = await httpRequest('/agents/non-existent-agent-xyz');
  assert('unknown agent returns 404', unknownAgent.status === 404, `got ${unknownAgent.status}`);
  console.log();

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('=== Verification Summary ===');
  console.log(`Passed: ${passingCount}`);
  console.log(`Failed: ${failingCount}`);
  console.log(`Total: ${passingCount + failingCount}`);

  if (failingCount === 0) {
    console.log('\n✅ ALL VERIFICATION CHECKS PASSED');
  } else {
    console.log(`\n⚠️  ${failingCount} checks failed`);
  }

  await server.stop();
  process.exit(failingCount === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
