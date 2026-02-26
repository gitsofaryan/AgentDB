import { AgentRuntime } from './lib/index.js';

async function main() {
    console.log("==========================================================");
    console.log(" 🧠 AGENT DB UNIFIED CLI DEMONSTRATION");
    console.log("==========================================================\n");

    console.log("Step 1: Instantiating Autonomous Agents...");
    const agentA = await AgentRuntime.create();
    const agentB = await AgentRuntime.create();
    
    console.log(`  Agent A DID:   ${agentA.identity.did()}`);
    console.log(`  Agent B DID:   ${agentB.identity.did()}\n`);

    console.log("Step 2: Agent A starts a mutable memory stream on IPNS...");
    const ipnsNameId = await agentA.startMemoryStream({ 
        status: "Idling", 
        lastCommand: null, 
        thoughts: "I am waking up." 
    });
    console.log(`\n🔗 Agent A's permanent IPNS Identity: ${ipnsNameId}\n`);

    console.log("Step 3: Agent A gives Agent B a UCAN delegation to read its memory stream.");
    const delegation = await agentA.delegateTo(agentB.identity, 'agent/read', 24);
    console.log("  Delegation Token Issued!\n");

    console.log("Step 4: Agent B fetches Agent A's thoughts...");
    const thoughts1 = await agentB.fetchMemoryStream(ipnsNameId, delegation.delegation);
    console.log(`  🤖 Agent B read: ${JSON.stringify(thoughts1)}\n`);

    console.log("Step 5: Agent A executes a task and updates its thoughts...");
    await agentA.updateMemoryStream({ 
        status: "Active", 
        lastCommand: "Scan network", 
        thoughts: "I detect anomalies. Informing the swarm." 
    });

    console.log("\nStep 6: Agent B fetches from the EXACT SAME IPNS Name and sees the update!");
    const thoughts2 = await agentB.fetchMemoryStream(ipnsNameId, delegation.delegation);
    console.log(`  🤖 Agent B read: ${JSON.stringify(thoughts2)}\n`);

    console.log("🚀 DEMONSTRATION COMPLETE!");
}

main().catch(console.error);
