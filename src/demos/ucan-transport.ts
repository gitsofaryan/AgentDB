/**
 * Demo: UCAN Serialization & Transport Round-Trip
 *
 * This demonstrates the core mechanism that enables both communication approaches:
 * 1. Agent A creates an identity and issues a UCAN delegation for Agent B
 * 2. The delegation is serialized to a portable CAR archive (Uint8Array)
 * 3. The CAR bytes are encoded as base64 (for HTTP transport)
 * 4. Agent B decodes the base64 back to bytes
 * 5. Agent B deserializes the CAR bytes into a full delegation object
 * 6. Agent B verifies the delegation is authentic and unexpired
 *
 * This round-trip is the foundation for:
 * - Approach 1 (IPFS): CAR bytes are uploaded to IPFS, Agent B fetches via CID
 * - Approach 2 (API):  Base64 string is sent in HTTP headers as Bearer token
 */

import { UcanService } from '../lib/ucan.js';

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log(' 🔑 UCAN Serialization & Transport Demo');
    console.log('═══════════════════════════════════════════════════════════\n');

    // ── Step 1: Create Agent Identities ────────────────────────────
    console.log('Step 1: Creating agent identities...');
    const agentA = await UcanService.createIdentity();
    const agentB = await UcanService.createIdentity();
    console.log(`  Agent A (Master): ${agentA.did()}`);
    console.log(`  Agent B (Sub):    ${agentB.did()}\n`);

    // ── Step 2: Agent A Issues Delegation ──────────────────────────
    console.log('Step 2: Agent A issues UCAN delegation to Agent B...');
    const delegation = await UcanService.issueDelegation(agentA, agentB, 'agent/read', 24);
    console.log(`  Delegation CID: ${delegation.cid.toString()}`);
    console.log(`  Capability:     ${delegation.capabilities[0].can}`);
    console.log(`  Expires:        ${new Date(delegation.expiration * 1000).toISOString()}\n`);

    // ── Step 3: Serialize to CAR bytes ─────────────────────────────
    console.log('Step 3: Serializing delegation to CAR archive (bytes)...');
    const carBytes = await UcanService.serializeDelegation(delegation);
    console.log(`  CAR archive size: ${carBytes.length} bytes`);
    console.log(`  First 20 bytes:   [${Array.from(carBytes.slice(0, 20)).join(', ')}]\n`);

    // ── Step 4: Encode as Base64 (for HTTP transport) ──────────────
    console.log('Step 4: Encoding as base64 (for REST API transport)...');
    const base64Token = await UcanService.delegationToBase64(delegation);
    console.log(`  Base64 length:  ${base64Token.length} chars`);
    console.log(`  Token preview:  ${base64Token.slice(0, 60)}...\n`);

    // ── Step 5: Agent B Decodes from Base64 ────────────────────────
    console.log('Step 5: Agent B receives and decodes from base64...');
    const decoded = await UcanService.delegationFromBase64(base64Token);
    console.log(`  Decoded CID:    ${decoded.cid.toString()}`);
    console.log(`  Issuer:         ${decoded.issuer.did()}`);
    console.log(`  Audience:       ${decoded.audience.did()}`);
    console.log(`  Capability:     ${decoded.capabilities[0].can}\n`);

    // ── Step 6: Agent B Verifies the Delegation ────────────────────
    console.log('Step 6: Agent B verifies the delegation...');

    // Valid check
    const validResult = UcanService.verifyDelegation(decoded, agentA.did(), 'agent/read');
    console.log(`  ✅ Valid check:         ${JSON.stringify(validResult)}`);

    // Wrong issuer check
    const wrongIssuer = UcanService.verifyDelegation(decoded, agentB.did(), 'agent/read');
    console.log(`  ❌ Wrong issuer check:  ${JSON.stringify(wrongIssuer)}`);

    // Wrong capability check
    const wrongCap = UcanService.verifyDelegation(decoded, agentA.did(), 'agent/write');
    console.log(`  ❌ Wrong cap check:     ${JSON.stringify(wrongCap)}`);

    // ── Step 7: Verify CIDs Match ──────────────────────────────────
    console.log('\nStep 7: Verifying round-trip integrity...');
    const cidMatch = delegation.cid.toString() === decoded.cid.toString();
    const issuerMatch = delegation.issuer.did() === decoded.issuer.did();
    const audienceMatch = delegation.audience.did() === decoded.audience.did();

    console.log(`  CID match:      ${cidMatch ? '✅' : '❌'}`);
    console.log(`  Issuer match:   ${issuerMatch ? '✅' : '❌'}`);
    console.log(`  Audience match: ${audienceMatch ? '✅' : '❌'}`);

    if (cidMatch && issuerMatch && audienceMatch && validResult.valid) {
        console.log('\n🚀 ROUND-TRIP COMPLETE: Delegation survived serialize → base64 → deserialize → verify!\n');
        console.log('This token can now be:');
        console.log('  📦 IPFS Approach:  Uploaded as CAR bytes to Storacha IPFS, fetched via CID');
        console.log('  🌐 API Approach:   Sent as Authorization: Bearer <base64Token> in HTTP headers');
    } else {
        console.error('\n❌ ROUND-TRIP FAILED: Something went wrong in serialization.');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Demo failed:', err);
    process.exit(1);
});
