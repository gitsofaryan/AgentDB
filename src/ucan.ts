import * as Signer from '@ucanto/principal/ed25519';
import { delegate } from '@ucanto/core';

async function main() {
  console.log("Generating Agent A (Master Agent)...");
  const agentA = await Signer.generate();
  console.log("Agent A DID:", agentA.did());

  console.log("\nGenerating Agent B (Sub-Agent)...");
  const agentB = await Signer.generate();
  console.log("Agent B DID:", agentB.did());

  console.log("\nAgent A is creating a UCAN delegation for Agent B...");
  
  // Agent A delegates the right to "read" Agent A's memories to Agent B
  const ucan = await delegate({
    issuer: agentA,
    audience: agentB,
    capabilities: [
      {
        with: agentA.did(),
        can: 'agent/read'
      }
    ],
    // Good for 24 hours
    expiration: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
  });

  console.log("\n✅ UCAN Delegation created successfully!");
  console.log("--------------------------------------------------");
  console.log("Delegation CID (Agent B can use this token ID to prove access):");
  console.log(ucan.cid.toString());
  console.log("--------------------------------------------------");

  console.log("\nNow Agent B has cryptographic proof that Agent A authorized it, without needing any central server or database.");
}

main().catch(console.error);
