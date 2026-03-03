import { AgentRuntime } from './lib/runtime.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    console.log("==========================================");
    console.log("✈️ AGENT MIGRATION DEMO (Device-Agnostic)");
    console.log("==========================================\n");

    const SHARED_SEED = "agent_migration_secret_99";
    const STORAGE_DIR = path.join(process.cwd(), '.agent_storage');

    // --- STEP 1: HOME PC ---
    console.log("🏠 [Environment: Home PC]");
    const agentHome = await AgentRuntime.loadFromSeed(SHARED_SEED);
    console.log(`🤖 Agent Initialized: ${agentHome.did}`);

    console.log("✍️ Storing 'Work Project' context...");
    const cid = await agentHome.storePublicMemory({ project: "Operation Antigravity", status: "Active" });
    await agentHome.setNamespaceCid("WORK_PROJECT", cid);
    console.log(`✅ Session Registry updated on IPNS. CID: ${cid}\n`);

    // --- CRITICAL STEP: SIMULATE DEVICE WIPE ---
    console.log("💥 SIMULATING DEVICE WIPE: Deleting local indexing files...");
    try {
        await fs.rm(STORAGE_DIR, { recursive: true, force: true });
        console.log("🗑️ Local .agent_storage vanished!\n");
    } catch (e) {}

    // --- STEP 2: CLOUD SERVER ---
    console.log("☁️ [Environment: Cloud Server]");
    console.log("🤖 Initializing agent from the SAME SEED on a fresh machine...");
    const agentCloud = await AgentRuntime.loadFromSeed(SHARED_SEED);
    
    console.log("🔍 Looking for 'WORK_PROJECT' in the DECENTRALIZED registry...");
    const recoveredCid = await agentCloud.getNamespaceCid("WORK_PROJECT");
    
    if (recoveredCid) {
        console.log(`🎯 Found CID on IPNS: ${recoveredCid}`);
        const data = await agentCloud.retrievePublicMemory(recoveredCid);
        console.log("📜 Recovered Data:");
        console.log(JSON.stringify(data, null, 2));
        
        console.log("\n✅ SUCCESS: Agent migrated successfully with ZERO local state!");
    } else {
        console.log("❌ FAILED: Registry not found on IPNS.");
    }

    console.log("\n==========================================");
}

main().catch(console.error);
