/**
 * Demo: REST API Gateway — Full Agent-to-Agent Flow
 *
 * This script demonstrates how a Web2 AI agent (Agent B) can consume
 * context from Agent A through the REST API Gateway.
 *
 * Prerequisites: Start the server first with:
 *   npx tsx src/server/index.ts
 *
 * Then run this demo:
 *   npx tsx src/demos/api-gateway-flow.ts
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🌐 REST API Gateway — Agent-to-Agent Flow');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ── Step 1: Create Agent A ─────────────────────────────────────
    console.log('Step 1: Creating Agent A identity via API...');
    const agentARes = await fetch(`${API_BASE}/api/identity`, { method: 'POST' });
    const agentA = await agentARes.json();
    console.log(`  Agent A DID: ${agentA.did}\n`);

    // ── Step 2: Create Agent B ─────────────────────────────────────
    console.log('Step 2: Creating Agent B identity via API...');
    const agentBRes = await fetch(`${API_BASE}/api/identity`, { method: 'POST' });
    const agentB = await agentBRes.json();
    console.log(`  Agent B DID: ${agentB.did}\n`);

    // ── Step 3: Agent A Stores Memory ──────────────────────────────
    console.log('Step 3: Agent A stores context to IPFS via API...');
    const memoryRes = await fetch(`${API_BASE}/api/memory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            did: agentA.did,
            context: {
                status: 'exploring',
                goal: 'find-water',
                location: { x: 42, y: 17 },
                inventory: ['map', 'compass', 'torch'],
            }
        }),
    });
    const memory = await memoryRes.json();
    console.log(`  Memory CID: ${memory.cid}`);
    console.log(`  Simulated:  ${memory.simulated}\n`);

    // ── Step 4: Agent A Delegates Access to Agent B ─────────────────
    console.log('Step 4: Agent A issues UCAN delegation to Agent B...');
    const delegateRes = await fetch(`${API_BASE}/api/delegate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            issuerDid: agentA.did,
            audienceDid: agentB.did,
            ability: 'agent/read',
            memoryCids: [memory.cid],
            expirationHours: 24,
        }),
    });
    const delegationResult = await delegateRes.json();
    console.log(`  Delegation ID: ${delegationResult.delegationId}`);
    console.log(`  Token length:  ${delegationResult.base64Token.length} chars`);
    console.log(`  Expires:       ${delegationResult.expiresAt}\n`);

    // ── Step 5: Agent B Fetches Delegation ──────────────────────────
    console.log('Step 5: Agent B fetches their delegation token...');
    const fetchDlgRes = await fetch(`${API_BASE}/api/delegation/${delegationResult.delegationId}`);
    const fetchedDlg = await fetchDlgRes.json();
    console.log(`  Token received: ${fetchedDlg.base64Token.slice(0, 40)}...`);
    console.log(`  Issuer:         ${fetchedDlg.issuerDid}`);
    console.log(`  Hint:           ${fetchedDlg.hint}\n`);

    // ── Step 6: Agent B Retrieves Memory Without Token (Should Fail) ─
    console.log('Step 6: Agent B tries to access memory WITHOUT token...');
    const noAuthRes = await fetch(`${API_BASE}/api/memory/${memory.cid}`);
    const noAuth = await noAuthRes.json();
    console.log(`  Status: ${noAuthRes.status}`);
    console.log(`  Error:  ${noAuth.error}\n`);

    // ── Step 7: Agent B Retrieves Memory With Token (Should Succeed) ─
    console.log('Step 7: Agent B retrieves memory WITH UCAN token...');
    const authRes = await fetch(`${API_BASE}/api/memory/${memory.cid}`, {
        headers: {
            'Authorization': `Bearer ${fetchedDlg.base64Token}`,
        },
    });
    const authResult = await authRes.json();
    console.log(`  Status:       ${authRes.status}`);
    console.log(`  Verification: ${authResult.verification}`);
    console.log(`  Issuer:       ${authResult.issuer}`);
    console.log(`  Audience:     ${authResult.audience}`);
    if (authResult.memory) {
        console.log(`  Memory:       ${JSON.stringify(authResult.memory).slice(0, 80)}...`);
    } else {
        console.log(`  Note:         ${authResult.note}`);
    }

    console.log('\n🚀 FULL API FLOW COMPLETE!');
    console.log('\nThis demonstrates how a Web2 AI agent can:');
    console.log('  1. Create an identity (POST /api/identity)');
    console.log('  2. Receive a UCAN delegation from Agent A');
    console.log('  3. Use the delegation as a Bearer token to access Agent A\'s context');
    console.log('  4. All without touching any blockchain or IPFS client directly');
}

main().catch(err => {
    console.error('Demo failed:', err.message);
    console.error('Make sure the API server is running: npx tsx src/server/index.ts');
    process.exit(1);
});
