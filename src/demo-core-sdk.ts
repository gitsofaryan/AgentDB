import { AgentRuntime } from './lib/runtime.js';

async function main() {
    console.log("==========================================");
    console.log("🧠 CORE SDK DEMO: Cross-Agent Memory Delegation");
    console.log("==========================================\n");

    console.log("1. Initializing Agent A (The Creator)");
    const agentA = await AgentRuntime.loadFromSeed("agent_a_super_secret_seed" + Math.random());
    console.log(`   Agent A DID: ${agentA.did}\n`);

    console.log("2. Initializing Agent B (The Reader)");
    const agentB = await AgentRuntime.loadFromSeed("agent_b_super_secret_seed" + Math.random());
    console.log(`   Agent B DID: ${agentB.did}\n`);

    // --- AGENT A WORKFLOW ---
    const longContext = {
        task: "Deep analysis of Web3 architecture",
        findings: [
            "IPFS is essential for decentralized permanence.",
            "UCANs provide amazing cryptographic capability delegation without a central server.",
            "Zama fhEVM enables confidential compute."
        ],
        timestamp: new Date().toISOString()
    };

    console.log("3. Agent A: Storing Long Context to Real Storacha (IPFS)...");
    const memCid = await agentA.storePublicMemory(longContext);
    console.log(`   ✅ Memory pinned successfully!`);
    console.log(`   CID: ${memCid}`);
    console.log(`   Gateway: https://storacha.link/ipfs/${memCid}\n`);

    console.log("4. Agent A: Creating UCAN Delegation for Agent B...");
    // Agent A grants Agent B the permission to read for 2 hours
    const delegation = await agentA.delegateTo(agentB.identity, 'agent/read', 2);
    
    // In a real scenario, Agent A sends these variables over a network to Agent B
    const sharedData = {
        cid: memCid,
        ucan: delegation
    };
    console.log(`   ✅ UCAN Token generated.\n`);

    // --- AGENT B WORKFLOW ---
    console.log("5. Agent B: Receiving network payload and fetching memory...");
    const retrievedContext = await agentB.retrievePublicMemory(sharedData.cid, sharedData.ucan);
    
    if (retrievedContext) {
        console.log(`   ✅ Agent B successfully fetched and read the memory using the UCAN token!`);
        console.log("   --- Decoded Context ---");
        console.log(JSON.stringify(retrievedContext, null, 2));
    } else {
        console.error("   ❌ Agent B failed to retrieve the memory.");
    }
}

main().catch(console.error);
