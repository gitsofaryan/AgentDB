import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AgentRuntime } from "./lib/runtime.js";
import { z } from "zod";

/**
 * Agent DB MCP Server
 * Provides decentralized memory, encryption, and delegation tools to AI models.
 */

const server = new Server(
  {
    name: "agent-db",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let activeAgent: AgentRuntime | null = null;

// Tool Definitions
const TOOLS = [
  {
    name: "init_agent",
    description: "Initialize or log in as an AI agent using a secret seed phrase.",
    inputSchema: {
      type: "object",
      properties: {
        seed: { type: "string", description: "The secret seed phrase for the agent identity." },
      },
      required: ["seed"],
    },
  },
  {
    name: "store_memory",
    description: "Save public context or data to decentralized storage (IPFS).",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "The JSON data to store." },
      },
      required: ["data"],
    },
  },
  {
    name: "retrieve_memory",
    description: "Recall public data from decentralized storage using a CID. Optionally provide a UCAN token if access is delegated.",
    inputSchema: {
      type: "object",
      properties: {
        cid: { type: "string", description: "The CID of the memory to fetch." },
        ucan: { type: "string", description: "Optional: Base64 encoded UCAN delegation token." },
      },
      required: ["cid"],
    },
  },
  {
    name: "store_private_memory",
    description: "Encrypt (ECIES) and store sensitive data that only this agent can read.",
    inputSchema: {
      type: "object",
      properties: {
        data: { type: "object", description: "The sensitive JSON data to encrypt and store." },
      },
      required: ["data"],
    },
  },
  {
    name: "retrieve_private_memory",
    description: "Retrieve and decrypt private data from the agent's secure vault.",
    inputSchema: {
      type: "object",
      properties: {
        cid: { type: "string", description: "The CID of the encrypted memory." },
      },
      required: ["cid"],
    },
  },
  {
    name: "delegate_access",
    description: "Grant another agent permission to access your memory using a UCAN ticket.",
    inputSchema: {
      type: "object",
      properties: {
        target_did: { type: "string", description: "The DID of the agent receiving access." },
        capability: { type: "string", description: "The permission type (e.g., 'agent/read').", default: "agent/read" },
        expiry_hours: { type: "number", description: "How long the access lasts in hours.", default: 24 },
      },
      required: ["target_did"],
    },
  },
  {
    name: "read_semantic_memory",
    description: "Read the agent's core semantic memory (like memory.md) which contains stable facts and preferences.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "update_semantic_memory",
    description: "Update the agent's core semantic memory with new facts or refined preferences.",
    inputSchema: {
      type: "object",
      properties: {
        markdown: { type: "string", description: "The complete markdown content for semantic memory." },
      },
      required: ["markdown"],
    },
  },
  {
    name: "read_daily_log",
    description: "Read the agent's episodic memory (daily log) for a specific date.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "The date in YYYY-MM-DD format." },
      },
      required: ["date"],
    },
  },
  {
    name: "append_daily_log",
    description: "Append a new entry or fact to the agent's episodic memory (daily log) for a specific date.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "The date in YYYY-MM-DD format." },
        markdown: { type: "string", description: "The markdown content to append." },
      },
      required: ["date", "markdown"],
    },
  },
  {
    name: "list_sessions",
    description: "List all known session namespaces (chat contexts) in the agent's decentralized registry.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "resolve_session",
    description: "Find the CID and latest data for a specific session namespace.",
    inputSchema: {
      type: "object",
      properties: {
        namespace: { type: "string", description: "The namespace to resolve (e.g., 'CHAT_ALICE')." },
      },
      required: ["namespace"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "init_agent": {
        const { seed } = args as { seed: string };
        activeAgent = await AgentRuntime.loadFromSeed(seed);
        return {
          content: [{ type: "text", text: `Agent initialized successfully. DID: ${activeAgent.did}` }],
        };
      }

      case "store_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { data } = args as { data: object };
        const cid = await activeAgent.storePublicMemory(data);
        return {
          content: [{ type: "text", text: `Memory stored successfully. CID: ${cid}` }],
        };
      }

      case "retrieve_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { cid, ucan } = args as { cid: string; ucan?: string };
        const data = await activeAgent.retrievePublicMemory(cid, ucan);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "store_private_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { data } = args as { data: object };
        const cid = await activeAgent.storePrivateMemory(data);
        return {
          content: [{ type: "text", text: `Private memory encrypted and stored. CID: ${cid}` }],
        };
      }

      case "retrieve_private_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { cid } = args as { cid: string };
        const data = await activeAgent.retrievePrivateMemory(cid);
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      }

      case "delegate_access": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { target_did, capability, expiry_hours } = args as { 
          target_did: string; 
          capability: string; 
          expiry_hours: number 
        };
        const targetPrincipal = { did: () => target_did };
        const delegation = await activeAgent.delegateTo(targetPrincipal, capability || "agent/read", expiry_hours || 24);
        const base64Token = await activeAgent.exportDelegationForApi(delegation);
        return {
          content: [{ type: "text", text: `Access delegated to ${target_did}. UCAN Token (base64): ${base64Token}` }],
        };
      }

      case "read_semantic_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const markdown = await activeAgent.readSemanticMemory();
        return { content: [{ type: "text", text: markdown }] };
      }

      case "update_semantic_memory": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { markdown } = args as { markdown: string };
        const cid = await activeAgent.updateSemanticMemory(markdown);
        return { content: [{ type: "text", text: `Semantic memory updated successfully. CID: ${cid}` }] };
      }

      case "read_daily_log": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { date } = args as { date: string };
        const markdown = await activeAgent.readDailyLog(date);
        return { content: [{ type: "text", text: markdown }] };
      }

      case "append_daily_log": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { date, markdown } = args as { date: string; markdown: string };
        const cid = await activeAgent.appendDailyLog(date, markdown);
        return { content: [{ type: "text", text: `Daily log appended successfully. CID: ${cid}` }] };
      }

      case "save_session_snapshot": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { session_id, markdown } = args as { session_id: string; markdown: string };
        const cid = await activeAgent.saveSessionSnapshot(session_id, markdown);
        return { content: [{ type: "text", text: `Session snapshot saved. CID: ${cid}` }] };
      }

      case "list_sessions": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const sessions = await activeAgent.listNamespaces();
        return {
          content: [{ type: "text", text: `Known Sessions:\n${sessions.map(s => `- ${s}`).join("\n")}` }],
        };
      }

      case "resolve_session": {
        if (!activeAgent) throw new Error("Agent not initialized. Call init_agent first.");
        const { namespace } = args as { namespace: string };
        const cid = await activeAgent.getNamespaceCid(namespace);
        if (!cid) {
          return { content: [{ type: "text", text: `Namespace '${namespace}' not found.` }], isError: true };
        }
        const data = await activeAgent.retrievePublicMemory(cid);
        return {
          content: [{ type: "text", text: `Namespace: ${namespace}\nCID: ${cid}\n\nData:\n${JSON.stringify(data, null, 2)}` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const err = error as Error;
    console.error(`[MCP Error in ${name}]:`, err.stack || err.message);
    return {
      content: [{ type: "text", text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Agent DB MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
