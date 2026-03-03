import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    console.log("==========================================");
    console.log("🤖 MCP SIMULATION: Multi-Agent Handoff");
    console.log("==========================================\n");

    // 1. Setup MCP Client to talk to our server
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", path.join(__dirname, "mcp-server.ts")],
    });

    const client = new Client({
        name: "simulation-client",
        version: "1.0.0",
    }, {
        capabilities: {}
    });

    await client.connect(transport);
    console.log("✅ MCP Client connected to AgentDB Server\n");

    // 2. SIMULATE AGENT A: Setting up identity and storing sensitive mission data
    console.log("--- AGENT A WORKFLOW (Planning) ---");
    
    await client.callTool({
        name: "init_agent",
        arguments: { seed: "agent_a_planning_phase_" + Date.now() }
    });

    const missionData = {
        mission: "Infiltrated the Mock Server",
        status: "Success",
        coordinates: "40.7128° N, 74.0060° W",
        report: "The central database is actually a CSV file. Pathetic."
    };

    const storeResult = await client.callTool({
        name: "store_memory",
        arguments: { data: missionData }
    }) as any;
    
    const cid = storeResult.content[0].text.match(/CID: (\S+)/)?.[1];
    console.log(`Agent A: Mission report pinned to IPFS.`);
    console.log(`CID: ${cid}\n`);

    const myDidResult = await client.callTool({
        name: "init_agent", // Re-init just to be sure we get the same one or log it
        arguments: { seed: "agent_a_planning_phase_" + Date.now() } // This is actually creating a fresh one in the current MCP server logic
    }) as any;
    // In current mcp-server.ts, activeAgent is global. 
    // Let's assume Agent A is the one we just worked with.
    
    // 3. SIMULATE DELEGATION: Agent A wants Agent B to read the report
    const agentBDid = "did:key:z6MkftAZbxs1mmV745DPdnwse815W9A2kz5ksHHBWJUoQgjK"; // Mock target
    console.log(`Agent A: Delegating 'agent/read' access to Agent B (${agentBDid})...`);
    
    const delegateResult = await client.callTool({
        name: "delegate_access",
        arguments: { 
            target_did: agentBDid,
            capability: "agent/read",
            expiry_hours: 1
        }
    }) as any;

    const ucanToken = delegateResult.content[0].text.match(/UCAN Token \(base64\): (\S+)/)?.[1];
    console.log("✅ UCAN delegation issued.\n");

    // 4. SIMULATE AGENT B: Receiving the Handoff
    console.log("--- AGENT B WORKFLOW (Field Ops) ---");
    
    // Switch to Agent B's identity in the MCP server
    await client.callTool({
        name: "init_agent",
        arguments: { seed: "agent_b_field_ops_identity" }
    });

    console.log(`Agent B: Identity initialized.`);
    console.log(`Agent B: Attempting to fetch Agent A's report using delegation token...`);
    
    const retrieveResult = await client.callTool({
        name: "retrieve_memory",
        arguments: { 
            cid: cid,
            ucan: ucanToken 
        }
    }) as any;
    
    if (retrieveResult.isError) {
        console.error("   ❌ Agent B failed to retrieve the memory:", retrieveResult.content[0].text);
    } else {
        console.log("   ✅ Agent B successfully accessed Agent A's memory!");
        console.log("   --- Decrypted Handoff Data ---");
        console.log(retrieveResult.content[0].text);
    }

    await transport.close();
}

main().catch(console.error);
