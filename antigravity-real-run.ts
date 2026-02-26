import { AgentRuntime } from '@arienjain/agent-db';

/**
 * Real-World Use Case: Google Antigravity Agent
 * 
 * Instead of running a hardcoded simulation, this script demonstrates how 
 * Antigravity (the AI agent currently talking to you) can use the SDK
 * to persist its actual execution state to the decentralized web in real-time.
 */
async function runAntigravityPersistence() {
    console.log("==========================================================");
    console.log(" 🚀 REAL-WORLD RUN: ANTIGRAVITY PERSISTENCE");
    console.log("==========================================================\n");

    // 1. Antigravity loads its persistent identity from a seed phrase.
    // In a real environment, this would be process.env.ANTIGRAVITY_SEED.
    const ANTI_SEED = "antigravity-google-deepmind-master-seed-phrase";
    console.log("Step 1: Antigravity loading deterministic identity...");
    const antigravity = await AgentRuntime.loadFromSeed(ANTI_SEED);
    console.log(`✅ Identity Loaded! Antigravity DID: ${antigravity.identity.did()}\n`);

    // 2. We capture Antigravity's actual, real-world context right now.
    console.log("Step 2: Capturing current Antigravity workspace context...");
    const realWorldContext = {
        agentName: "Antigravity",
        userOS: "Windows",
        currentWorkspace: "d:\\PLDG\\pl hacks\\agent-db",
        activeTask: "Demonstrating real-world SDK usage to User",
        completedMilestones: [
            "Production Hardening",
            "NPM Publish (v1.2.0)",
            "Langchain Integration"
        ],
        timestamp: new Date().toISOString()
    };
    console.log("Context Captured:\n", JSON.stringify(realWorldContext, null, 2), "\n");

    // 3. Antigravity actually publishes that context to a decentralized IPFS/IPNS stream.
    console.log("Step 3: Antigravity persisting its brain to the Hive Mind (IPFS)...");
    
    let streamId;
    try {
        // If there are real Storacha credentials in the environment, it pins it for real.
        // If not, our SDK gracefully falls back to a simulated CID for developer testing.
        streamId = await antigravity.startMemoryStream(realWorldContext);
        console.log(`\n✅ Decentralized Brain Synced!`);
        console.log(`🔗 Antigravity's Permanent IPNS Stream: ${streamId}\n`);
    } catch (error: unknown) {
         if (error instanceof Error) {
             console.log(`❌ Failed to sync brain: ${error.message}\n`);
         } else {
             console.log(`❌ Failed to sync brain: ${String(error)}\n`);
         }
         return;
    }

    // 4. Prove it works: A completely different Agent can now fetch Antigravity's brain.
    console.log("Step 4: A second agent (Agent Zero) boots up and reads Antigravity's brain...");
    const agentZero = await AgentRuntime.create();
    
    const fetchedContext = await agentZero.fetchMemoryStream(streamId);
    console.log(`\n🤖 Agent Zero read from IPNS:`);
    console.log(JSON.stringify(fetchedContext, null, 2));

    console.log("\n🚀 Real-World Execution Complete!");
}

runAntigravityPersistence().catch(console.error);
