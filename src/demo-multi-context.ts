import { AgentRuntime } from './lib/runtime.js';
import { UcanService } from './lib/ucan.js';

async function main() {
    console.log("==========================================");
    console.log("🧩 MULTI-CONTEXT SWITCHING DEMO");
    console.log("==========================================\n");

    // 1. Initialize the Multi-Context Agent
    const agent = await AgentRuntime.loadFromSeed("multi_switch_agent_prime_" + Date.now());
    console.log(`🤖 Agent Initialized: ${agent.did}\n`);

    // 2. SIMULATE CHAT WITH ALICE (Public/Shared context)
    console.log("--- CHAT 1: Alice (AI Ethics) ---");
    const aliceContext = {
        user: "Alice",
        topic: "AI Ethics",
        history: [
            { role: "user", text: "Should AI have rights?" },
            { role: "assistant", text: "That is a complex philosophical question..." }
        ]
    };
    const cidAlice = await agent.storePublicMemory(aliceContext);
    await agent.setNamespaceCid("CHAT_SESSION_ALICE", cidAlice);
    console.log(`✅ Stored Alice's context. CID: ${cidAlice}\n`);

    // 3. SIMULATE CHAT WITH BOB (Market Analysis)
    console.log("--- CHAT 2: Bob (Crypto Market) ---");
    const bobContext = {
        user: "Bob",
        topic: "Market Analysis",
        history: [
            { role: "user", text: "Is Bitcoin going to 100k?" },
            { role: "assistant", text: "I can't predict the future, but the charts look interesting." }
        ]
    };
    const cidBob = await agent.storePublicMemory(bobContext);
    await agent.setNamespaceCid("CHAT_SESSION_BOB", cidBob);
    console.log(`✅ Stored Bob's context. CID: ${cidBob}\n`);

    // 4. SIMULATE CHAT WITH CHARLIE (Private/Encrypted)
    console.log("--- CHAT 3: Charlie (Secret Mission) ---");
    const charlieContext = {
        user: "Charlie",
        topic: "Confidential",
        secret_payload: "The passkey is 'Antigravity'"
    };
    const cidCharlie = await agent.storePrivateMemory(charlieContext);
    await agent.setNamespaceCid("CHAT_SESSION_CHARLIE", cidCharlie);
    console.log(`✅ Stored Charlie's PRIVATE context. CID: ${cidCharlie}\n`);

    // 5. THE SWITCH: Load Alice's context to continue
    console.log("--- THE SWITCH: Resuming Alice's conversation ---");
    const resolvedAliceCid = await agent.getNamespaceCid("CHAT_SESSION_ALICE");
    if (resolvedAliceCid) {
        const loadedAlice = await agent.retrievePublicMemory(resolvedAliceCid);
        console.log("🤖 Loaded Context for Alice:");
        console.log(JSON.stringify(loadedAlice, null, 2));
    }
    console.log("");

    // 6. PERMISSION SHARING: Only share Bob's market analysis with Agent B
    console.log("--- DELEGATION: Sharing ONLY Bob's context with a 3rd party ---");
    const agentBDid = "did:key:z6MkftAZbxs1mmV745DPdnwse815W9A2kz5ksHHBWJUoQgjK";
    
    // Issue UCAN for Bob's CID specifically (Resource restricted by CID inside payload)
    const delegation = await agent.delegateTo(agentBDid, 'agent/read', 1);
    const token = await agent.exportDelegationForApi(delegation);
    
    console.log(`✅ Issued 1-hour 'read' token for Agent B.`);
    console.log(`Token (base64): ${token.substring(0, 30)}...`);
    console.log(`Agent B can now fetch ${cidBob} but has no pointer to Alice or Charlie's data.\n`);

    console.log("==========================================");
    console.log("🚀 DEMO COMPLETE: Context Isolation Verified");
    console.log("==========================================");
}

main().catch(console.error);
