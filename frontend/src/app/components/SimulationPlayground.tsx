"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import SimSidebar, { type SimScenario, type SimParams } from "./SimSidebar";
import SimCanvas from "./SimCanvas";
import SimInspector, { type InspectedNode } from "./SimInspector";
import SimTerminal, { type LogEntry, getLogColor } from "./SimTerminal";

/* ═══════════════════════════════════════════════════════════════════════
   SCENARIO DEFINITIONS
   ═══════════════════════════════════════════════════════════════════════ */

const SCENARIOS: SimScenario[] = [
    /* ─── 1. Cross-Agent Handoff ─────────────────────────────────────── */
    {
        id: "handoff",
        name: "Cross-Agent Handoff",
        icon: "🔄",
        description: "Full memory transfer from Agent B to Agent A via IPFS + UCAN",
        nodes: [
            { id: "agentB", label: "Agent B", type: "agent", x: 100, y: 200, did: "did:key:z6MkB_sender..." },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 350, y: 120, cid: "bafybeigh4mvd..." },
            { id: "ucan", label: "UCAN Auth", type: "ucan", x: 350, y: 300, capabilities: ["session/read", "memory/write"], expiry: "24h" },
            { id: "agentA", label: "Agent A", type: "agent", x: 600, y: 200, did: "did:key:z6MkA_receiver..." },
        ],
        connections: [
            { id: "b-ipfs", from: "agentB", to: "ipfs", label: "PIN" },
            { id: "b-ucan", from: "agentB", to: "ucan", label: "DELEGATE" },
            { id: "ucan-a", from: "ucan", to: "agentA", label: "GRANT" },
            { id: "ipfs-a", from: "ipfs", to: "agentA", label: "FETCH" },
        ],
        steps: [
            { phase: "init", label: "Initialize Agents", activeNodes: ["agentB"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent B initialized: did:key:z6MkB_sender...", inspectTarget: "agentB" },
            { phase: "write", label: "Write Memory", activeNodes: ["agentB"], activeConnections: [], logPrefix: "STORE", logMessage: "Writing 20MB session context to memory buffer..." },
            { phase: "pin", label: "Pin to IPFS", activeNodes: ["agentB", "ipfs"], activeConnections: ["b-ipfs"], logPrefix: "STORE", logMessage: "Pinning memory to Storacha IPFS → CID: bafybeigh4mvd...", inspectTarget: "ipfs" },
            { phase: "delegate", label: "Issue UCAN", activeNodes: ["agentB", "ucan"], activeConnections: ["b-ucan"], logPrefix: "UCAN", logMessage: "Issuing delegation: session/read → Agent A | Exp: 24h", inspectTarget: "ucan" },
            { phase: "transmit", label: "Transmit Token", activeNodes: ["ucan", "agentA"], activeConnections: ["ucan-a"], logPrefix: "UCAN", logMessage: "Transmitting UCAN + CID reference to Agent A..." },
            { phase: "verify", label: "Verify Token", activeNodes: ["agentA"], activeConnections: [], logPrefix: "VERIFY", logMessage: "Agent A verifying UCAN signature chain... ✅ Valid" },
            { phase: "fetch", label: "Fetch Memory", activeNodes: ["agentA", "ipfs"], activeConnections: ["ipfs-a"], logPrefix: "GATEWAY", logMessage: "Fetching from Storacha gateway → 312ms response" },
            { phase: "complete", label: "Handoff Complete", activeNodes: ["agentA"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Cross-agent handoff complete. Agent A has full context.", inspectTarget: "agentA" },
        ],
    },

    /* ─── 2. Agent Migration ─────────────────────────────────────────── */
    {
        id: "migration",
        name: "Agent Migration",
        icon: "🚀",
        description: "Full context migration with encrypted vault transfer",
        nodes: [
            { id: "agentB", label: "Agent B", type: "agent", x: 100, y: 200, did: "did:key:z6MkB_origin..." },
            { id: "zama", label: "Zama Vault", type: "zama", x: 250, y: 80, encryptionType: "FHE-TFHE" },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 350, y: 320, cid: "bafybeimigrate..." },
            { id: "registry", label: "Registry", type: "registry", x: 500, y: 80 },
            { id: "agentA", label: "Agent A", type: "agent", x: 600, y: 200, did: "did:key:z6MkA_target..." },
        ],
        connections: [
            { id: "b-zama", from: "agentB", to: "zama", label: "ENCRYPT" },
            { id: "b-ipfs", from: "agentB", to: "ipfs", label: "STORE" },
            { id: "zama-a", from: "zama", to: "agentA", label: "DECRYPT" },
            { id: "ipfs-a", from: "ipfs", to: "agentA", label: "LOAD" },
            { id: "a-reg", from: "agentA", to: "registry", label: "REGISTER" },
        ],
        steps: [
            { phase: "snapshot", label: "Snapshot Context", activeNodes: ["agentB"], activeConnections: [], logPrefix: "MIGRATE", logMessage: "Creating full context snapshot for migration..." },
            { phase: "encrypt", label: "FHE Encrypt Keys", activeNodes: ["agentB", "zama"], activeConnections: ["b-zama"], logPrefix: "FHE", logMessage: "Encrypting private keys via Zama fhEVM...", inspectTarget: "zama" },
            { phase: "store", label: "Store on IPFS", activeNodes: ["agentB", "ipfs"], activeConnections: ["b-ipfs"], logPrefix: "STORE", logMessage: "Storing encrypted context → CID: bafybeimigrate..." },
            { phase: "transfer", label: "Transfer Vault", activeNodes: ["zama", "agentA"], activeConnections: ["zama-a"], logPrefix: "FHE", logMessage: "Transferring vault access to Agent A..." },
            { phase: "load", label: "Load Context", activeNodes: ["ipfs", "agentA"], activeConnections: ["ipfs-a"], logPrefix: "GATEWAY", logMessage: "Agent A loading context from IPFS... 289ms" },
            { phase: "register", label: "Update Registry", activeNodes: ["agentA", "registry"], activeConnections: ["a-reg"], logPrefix: "MIGRATE", logMessage: "Updating global registry → Agent A is now owner", inspectTarget: "registry" },
            { phase: "done", label: "Migration Complete", activeNodes: ["agentA"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Migration complete. Agent B retired gracefully." },
        ],
    },

    /* ─── 3. IPFS Gateway Racing ─────────────────────────────────────── */
    {
        id: "gateway-race",
        name: "IPFS Gateway Racing",
        icon: "⚡",
        description: "Parallel retrieval race across 4 global gateways",
        nodes: [
            { id: "agentA", label: "Agent A", type: "agent", x: 100, y: 210, did: "did:key:z6MkA..." },
            { id: "gw1", label: "Cloudflare", type: "gateway", x: 380, y: 60, gatewayMs: 142 },
            { id: "gw2", label: "dweb.link", type: "gateway", x: 530, y: 130, gatewayMs: 312 },
            { id: "gw3", label: "nftstorage", type: "gateway", x: 530, y: 290, gatewayMs: 578 },
            { id: "gw4", label: "w3s.link", type: "gateway", x: 380, y: 360, gatewayMs: 890 },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 350, y: 210, cid: "bafyberace..." },
        ],
        connections: [
            { id: "a-ipfs", from: "agentA", to: "ipfs", label: "REQUEST" },
            { id: "ipfs-gw1", from: "ipfs", to: "gw1", label: "RACE" },
            { id: "ipfs-gw2", from: "ipfs", to: "gw2", label: "RACE" },
            { id: "ipfs-gw3", from: "ipfs", to: "gw3", label: "RACE" },
            { id: "ipfs-gw4", from: "ipfs", to: "gw4", label: "RACE" },
        ],
        steps: [
            { phase: "request", label: "Request Memory", activeNodes: ["agentA"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent A requesting CID: bafyberace..." },
            { phase: "dispatch", label: "Dispatch Requests", activeNodes: ["agentA", "ipfs"], activeConnections: ["a-ipfs"], logPrefix: "GATEWAY", logMessage: "Dispatching parallel requests to 4 gateways..." },
            { phase: "race", label: "Gateway Race", activeNodes: ["ipfs", "gw1", "gw2", "gw3", "gw4"], activeConnections: ["ipfs-gw1", "ipfs-gw2", "ipfs-gw3", "ipfs-gw4"], logPrefix: "GATEWAY", logMessage: "Racing... Cloudflare | dweb.link | nftstorage | w3s.link" },
            { phase: "cf-win", label: "Cloudflare Wins", activeNodes: ["gw1"], activeConnections: ["ipfs-gw1"], logPrefix: "GATEWAY", logMessage: "🏆 Cloudflare responded first: 142ms", inspectTarget: "gw1" },
            { phase: "others", label: "Other Responses", activeNodes: ["gw2", "gw3", "gw4"], activeConnections: [], logPrefix: "GATEWAY", logMessage: "dweb.link: 312ms | nftstorage: 578ms | w3s.link: 890ms" },
            { phase: "done", label: "Data Received", activeNodes: ["agentA"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Memory loaded via fastest gateway (142ms)" },
        ],
    },

    /* ─── 4. Private Memory Encryption ───────────────────────────────── */
    {
        id: "encryption",
        name: "Private Memory Encryption",
        icon: "🔐",
        description: "FHE encrypt → store → decrypt cycle with Zama fhEVM",
        nodes: [
            { id: "agentA", label: "Agent A", type: "agent", x: 100, y: 210, did: "did:key:z6MkA..." },
            { id: "zama", label: "Zama Vault", type: "zama", x: 350, y: 100, encryptionType: "FHE-TFHE" },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 350, y: 320, cid: "bafyencrypted..." },
            { id: "agentB", label: "Agent B", type: "agent", x: 600, y: 210, did: "did:key:z6MkB_reader..." },
        ],
        connections: [
            { id: "a-zama", from: "agentA", to: "zama", label: "ENCRYPT" },
            { id: "a-ipfs", from: "agentA", to: "ipfs", label: "STORE" },
            { id: "ipfs-b", from: "ipfs", to: "agentB", label: "FETCH" },
            { id: "zama-b", from: "zama", to: "agentB", label: "DECRYPT" },
        ],
        steps: [
            { phase: "write", label: "Write Sensitive Data", activeNodes: ["agentA"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent A preparing sensitive context (API keys, credentials)..." },
            { phase: "encrypt", label: "FHE Encrypt", activeNodes: ["agentA", "zama"], activeConnections: ["a-zama"], logPrefix: "FHE", logMessage: "Encrypting via Zama TFHE... homomorphic computation enabled", inspectTarget: "zama" },
            { phase: "store", label: "Store Encrypted", activeNodes: ["agentA", "ipfs"], activeConnections: ["a-ipfs"], logPrefix: "STORE", logMessage: "Storing ciphertext on IPFS → CID: bafyencrypted..." },
            { phase: "fetch", label: "Fetch Ciphertext", activeNodes: ["ipfs", "agentB"], activeConnections: ["ipfs-b"], logPrefix: "GATEWAY", logMessage: "Agent B fetching encrypted blob... 256ms" },
            { phase: "decrypt", label: "Decrypt in Vault", activeNodes: ["zama", "agentB"], activeConnections: ["zama-b"], logPrefix: "FHE", logMessage: "Decrypting via Zama fhEVM... authorized by UCAN proof" },
            { phase: "done", label: "Access Granted", activeNodes: ["agentB"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Private memory decrypted. Zero-knowledge proof verified." },
        ],
    },

    /* ─── 5. Multi-Context Switching ─────────────────────────────────── */
    {
        id: "context-switch",
        name: "Multi-Context Switching",
        icon: "🔀",
        description: "Agent loads and switches between multiple sessions",
        nodes: [
            { id: "agentA", label: "Agent A", type: "agent", x: 100, y: 210, did: "did:key:z6MkA..." },
            { id: "s1", label: "Session 1", type: "session", x: 350, y: 60 },
            { id: "s2", label: "Session 2", type: "session", x: 500, y: 210 },
            { id: "s3", label: "Session 3", type: "session", x: 350, y: 360 },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 600, y: 100, cid: "bafycontext..." },
        ],
        connections: [
            { id: "a-s1", from: "agentA", to: "s1", label: "LOAD" },
            { id: "a-s2", from: "agentA", to: "s2", label: "SWITCH" },
            { id: "a-s3", from: "agentA", to: "s3", label: "SWITCH" },
            { id: "s1-ipfs", from: "s1", to: "ipfs" },
            { id: "s2-ipfs", from: "s2", to: "ipfs" },
        ],
        steps: [
            { phase: "init", label: "Load Sessions", activeNodes: ["agentA"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent A discovering available sessions..." },
            { phase: "load1", label: "Load Session 1", activeNodes: ["agentA", "s1"], activeConnections: ["a-s1"], logPrefix: "STORE", logMessage: "Loading 'CHAT_ALICE' context from IPFS...", inspectTarget: "s1" },
            { phase: "fetch1", label: "Fetch from IPFS", activeNodes: ["s1", "ipfs"], activeConnections: ["s1-ipfs"], logPrefix: "GATEWAY", logMessage: "Fetching session CID from Storacha... 198ms" },
            { phase: "switch2", label: "Switch → Session 2", activeNodes: ["agentA", "s2"], activeConnections: ["a-s2"], logPrefix: "AGENT", logMessage: "Hot-switching to 'RESEARCH_QUANTUM' context...", inspectTarget: "s2" },
            { phase: "fetch2", label: "Load Session 2 Data", activeNodes: ["s2", "ipfs"], activeConnections: ["s2-ipfs"], logPrefix: "GATEWAY", logMessage: "Fetching session 2 CID... 157ms (cached)" },
            { phase: "switch3", label: "Switch → Session 3", activeNodes: ["agentA", "s3"], activeConnections: ["a-s3"], logPrefix: "AGENT", logMessage: "Switching to 'CODING_AGENT' context..." },
            { phase: "done", label: "Context Ready", activeNodes: ["agentA"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ 3 sessions indexed. Active: CODING_AGENT" },
        ],
    },

    /* ─── 6. Hive Mind (IPNS Stream) ─────────────────────────────────── */
    {
        id: "hive-mind",
        name: "Hive Mind (IPNS Stream)",
        icon: "🧠",
        description: "Live IPNS pointer updates for swarm intelligence",
        nodes: [
            { id: "agentA", label: "Agent A", type: "agent", x: 100, y: 120, did: "did:key:z6MkA..." },
            { id: "agentB", label: "Agent B", type: "agent", x: 100, y: 300, did: "did:key:z6MkB..." },
            { id: "ipns", label: "IPNS Pointer", type: "ipns", x: 350, y: 210 },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 600, y: 210, cid: "bafyhive..." },
            { id: "agentC", label: "Agent C", type: "agent", x: 600, y: 60, did: "did:key:z6MkC..." },
        ],
        connections: [
            { id: "a-ipns", from: "agentA", to: "ipns", label: "PUBLISH" },
            { id: "b-ipns", from: "agentB", to: "ipns", label: "SUBSCRIBE" },
            { id: "ipns-ipfs", from: "ipns", to: "ipfs", label: "RESOLVE" },
            { id: "ipfs-c", from: "ipfs", to: "agentC", label: "SYNC" },
        ],
        steps: [
            { phase: "publish", label: "A Publishes", activeNodes: ["agentA"], activeConnections: [], logPrefix: "IPNS", logMessage: "Agent A publishing shared memory to IPNS pointer..." },
            { phase: "update", label: "IPNS Update", activeNodes: ["agentA", "ipns"], activeConnections: ["a-ipns"], logPrefix: "IPNS", logMessage: "IPNS record updated: /ipns/k51qz... → bafyhive...", inspectTarget: "ipns" },
            { phase: "subscribe", label: "B Subscribes", activeNodes: ["agentB", "ipns"], activeConnections: ["b-ipns"], logPrefix: "IPNS", logMessage: "Agent B receiving IPNS update notification..." },
            { phase: "resolve", label: "Resolve CID", activeNodes: ["ipns", "ipfs"], activeConnections: ["ipns-ipfs"], logPrefix: "GATEWAY", logMessage: "Resolving IPNS pointer to latest CID..." },
            { phase: "sync", label: "Sync Agent C", activeNodes: ["ipfs", "agentC"], activeConnections: ["ipfs-c"], logPrefix: "AGENT", logMessage: "Agent C syncing shared intelligence from swarm...", inspectTarget: "agentC" },
            { phase: "done", label: "Hive Synced", activeNodes: ["agentA", "agentB", "agentC"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Hive mind synchronized across 3 agents." },
        ],
    },

    /* ─── 7. Concurrency Conflict ────────────────────────────────────── */
    {
        id: "concurrency",
        name: "Concurrency Conflict",
        icon: "⚔️",
        description: "Two agents write simultaneously — conflict resolution",
        nodes: [
            { id: "agentA", label: "Agent A", type: "agent", x: 100, y: 120, did: "did:key:z6MkA..." },
            { id: "agentB", label: "Agent B", type: "agent", x: 100, y: 300, did: "did:key:z6MkB..." },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 400, y: 210, cid: "bafyconflict..." },
            { id: "resolver", label: "Resolver", type: "registry", x: 600, y: 210 },
        ],
        connections: [
            { id: "a-ipfs", from: "agentA", to: "ipfs", label: "WRITE" },
            { id: "b-ipfs", from: "agentB", to: "ipfs", label: "WRITE" },
            { id: "ipfs-res", from: "ipfs", to: "resolver", label: "CONFLICT" },
            { id: "res-ipfs", from: "resolver", to: "ipfs", label: "MERGE" },
        ],
        steps: [
            { phase: "write-a", label: "Agent A Writes", activeNodes: ["agentA"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent A writing to session SHARED_WORKSPACE..." },
            { phase: "write-b", label: "Agent B Writes", activeNodes: ["agentB"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent B writing to same session simultaneously..." },
            { phase: "conflict", label: "Simultaneous Pin", activeNodes: ["agentA", "agentB", "ipfs"], activeConnections: ["a-ipfs", "b-ipfs"], logPrefix: "CONFLICT", logMessage: "⚠️ CONFLICT: Two CIDs pinned for same namespace!" },
            { phase: "detect", label: "Conflict Detected", activeNodes: ["ipfs", "resolver"], activeConnections: ["ipfs-res"], logPrefix: "CONFLICT", logMessage: "Conflict resolver engaged. Analyzing timestamps...", inspectTarget: "resolver" },
            { phase: "resolve", label: "CRDT Merge", activeNodes: ["resolver", "ipfs"], activeConnections: ["res-ipfs"], logPrefix: "CONFLICT", logMessage: "CRDT merge: last-writer-wins with Agent A's timestamp" },
            { phase: "done", label: "Resolved", activeNodes: ["agentA", "agentB"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Conflict resolved. Both agents synced to merged state." },
        ],
    },

    /* ─── 8. Claude MCP Server Integration ───────────────────────────── */
    {
        id: "mcp-claude",
        name: "Claude MCP Integration",
        icon: "🤝",
        description: "LLM uses AgentDB via MCP server for persistent memory",
        nodes: [
            { id: "claude", label: "Claude LLM", type: "llm", x: 100, y: 210, did: "did:key:z6MkClaude..." },
            { id: "mcp", label: "MCP Server", type: "mcp", x: 320, y: 210 },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 540, y: 100, cid: "bafymcp..." },
            { id: "zama", label: "Zama Vault", type: "zama", x: 540, y: 320, encryptionType: "FHE-TFHE" },
            { id: "ucan", label: "UCAN Auth", type: "ucan", x: 320, y: 80, capabilities: ["memory/write", "memory/read", "session/create"], expiry: "7d" },
        ],
        connections: [
            { id: "claude-mcp", from: "claude", to: "mcp", label: "TOOL CALL" },
            { id: "mcp-ucan", from: "mcp", to: "ucan", label: "AUTH" },
            { id: "mcp-ipfs", from: "mcp", to: "ipfs", label: "STORE" },
            { id: "mcp-zama", from: "mcp", to: "zama", label: "ENCRYPT" },
        ],
        steps: [
            { phase: "init", label: "MCP Handshake", activeNodes: ["claude", "mcp"], activeConnections: ["claude-mcp"], logPrefix: "AGENT", logMessage: "Claude connecting to AgentDB MCP server via stdio...", inspectTarget: "mcp" },
            { phase: "auth", label: "UCAN Auth", activeNodes: ["mcp", "ucan"], activeConnections: ["mcp-ucan"], logPrefix: "UCAN", logMessage: "MCP server issuing UCAN: memory/write + session/create | 7d", inspectTarget: "ucan" },
            { phase: "tool", label: "store_memory()", activeNodes: ["claude", "mcp"], activeConnections: ["claude-mcp"], logPrefix: "AGENT", logMessage: 'Claude calls: store_memory({ key: "research_notes", value: {...} })' },
            { phase: "store", label: "Pin to IPFS", activeNodes: ["mcp", "ipfs"], activeConnections: ["mcp-ipfs"], logPrefix: "STORE", logMessage: "MCP server pinning memory to Storacha → CID: bafymcp..." },
            { phase: "encrypt", label: "Encrypt Secrets", activeNodes: ["mcp", "zama"], activeConnections: ["mcp-zama"], logPrefix: "FHE", logMessage: "Encrypting API keys in Zama vault before storage...", inspectTarget: "zama" },
            { phase: "recall", label: "recall_memory()", activeNodes: ["claude", "mcp"], activeConnections: ["claude-mcp"], logPrefix: "AGENT", logMessage: 'Claude calls: recall_memory({ key: "research_notes" })' },
            { phase: "fetch", label: "Fetch & Return", activeNodes: ["mcp", "ipfs"], activeConnections: ["mcp-ipfs"], logPrefix: "GATEWAY", logMessage: "Fetching from IPFS gateway → 145ms. Returning to Claude." },
            { phase: "done", label: "Memory Recalled", activeNodes: ["claude"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Claude has persistent memory across sessions via AgentDB MCP." },
        ],
    },

    /* ─── 9. OpenClaw Semantic Memory ────────────────────────────────── */
    {
        id: "openclaw",
        name: "OpenClaw Semantic Memory",
        icon: "🧬",
        description: "Daily logs, snapshots, and semantic recall via OpenClaw",
        nodes: [
            { id: "agent", label: "AI Agent", type: "agent", x: 100, y: 210, did: "did:key:z6MkAgent..." },
            { id: "s1", label: "Daily Log", type: "session", x: 300, y: 80 },
            { id: "s2", label: "Snapshot", type: "session", x: 500, y: 80 },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 400, y: 320, cid: "bafysemantic..." },
            { id: "registry", label: "Semantic Index", type: "registry", x: 600, y: 210 },
        ],
        connections: [
            { id: "a-s1", from: "agent", to: "s1", label: "LOG" },
            { id: "a-s2", from: "agent", to: "s2", label: "SNAPSHOT" },
            { id: "s1-ipfs", from: "s1", to: "ipfs", label: "PIN" },
            { id: "s2-ipfs", from: "s2", to: "ipfs", label: "PIN" },
            { id: "ipfs-reg", from: "ipfs", to: "registry", label: "INDEX" },
        ],
        steps: [
            { phase: "log", label: "Write Daily Log", activeNodes: ["agent"], activeConnections: [], logPrefix: "AGENT", logMessage: "Agent writing daily interaction log (2.4KB)..." },
            { phase: "store-log", label: "Store Log Entry", activeNodes: ["agent", "s1"], activeConnections: ["a-s1"], logPrefix: "STORE", logMessage: "Appending to daily log: { date: '2026-03-03', entries: 47 }", inspectTarget: "s1" },
            { phase: "pin-log", label: "Pin Log to IPFS", activeNodes: ["s1", "ipfs"], activeConnections: ["s1-ipfs"], logPrefix: "STORE", logMessage: "Pinning daily log → CID: bafydailylog..." },
            { phase: "snapshot", label: "Create Snapshot", activeNodes: ["agent", "s2"], activeConnections: ["a-s2"], logPrefix: "AGENT", logMessage: "Creating full context snapshot (32KB compressed)...", inspectTarget: "s2" },
            { phase: "pin-snap", label: "Pin Snapshot", activeNodes: ["s2", "ipfs"], activeConnections: ["s2-ipfs"], logPrefix: "STORE", logMessage: "Pinning snapshot → CID: bafysnapshot..." },
            { phase: "index", label: "Semantic Index", activeNodes: ["ipfs", "registry"], activeConnections: ["ipfs-reg"], logPrefix: "AGENT", logMessage: "Indexing memory for semantic recall: embeddings updated", inspectTarget: "registry" },
            { phase: "recall", label: "Semantic Recall", activeNodes: ["agent", "registry"], activeConnections: [], logPrefix: "INFO", logMessage: 'Agent queries: "What did I discuss about quantum?" → 3 results' },
            { phase: "done", label: "Memory Complete", activeNodes: ["agent"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ OpenClaw memory layer active: 47 logs, 12 snapshots indexed." },
        ],
    },

    /* ─── 10. Multi-Agent Collaboration ──────────────────────────────── */
    {
        id: "multi-agent",
        name: "Multi-Agent Collaboration",
        icon: "👥",
        description: "Manager agent delegates tasks to sub-agents with scoped UCAN",
        nodes: [
            { id: "manager", label: "Manager", type: "agent", x: 100, y: 210, did: "did:key:z6MkManager..." },
            { id: "ucan", label: "UCAN Auth", type: "ucan", x: 300, y: 100, capabilities: ["task/assign", "memory/read"], expiry: "1h" },
            { id: "researcher", label: "Researcher", type: "agent", x: 500, y: 100, did: "did:key:z6MkResearch..." },
            { id: "coder", label: "Coder", type: "agent", x: 500, y: 320, did: "did:key:z6MkCoder..." },
            { id: "ipfs", label: "Storacha", type: "ipfs", x: 350, y: 320, cid: "bafycollab..." },
            { id: "registry", label: "Task Board", type: "registry", x: 600, y: 210 },
        ],
        connections: [
            { id: "m-ucan", from: "manager", to: "ucan", label: "SCOPE" },
            { id: "ucan-r", from: "ucan", to: "researcher", label: "DELEGATE" },
            { id: "ucan-c", from: "ucan", to: "coder", label: "DELEGATE" },
            { id: "r-ipfs", from: "researcher", to: "ipfs", label: "WRITE" },
            { id: "c-ipfs", from: "coder", to: "ipfs", label: "WRITE" },
            { id: "ipfs-reg", from: "ipfs", to: "registry", label: "SYNC" },
        ],
        steps: [
            { phase: "init", label: "Manager Plans", activeNodes: ["manager"], activeConnections: [], logPrefix: "AGENT", logMessage: "Manager agent creating task plan: [research, implement, test]..." },
            { phase: "scope", label: "Scope Permissions", activeNodes: ["manager", "ucan"], activeConnections: ["m-ucan"], logPrefix: "UCAN", logMessage: "Creating scoped UCAN: task/assign + memory/read | 1h expiry", inspectTarget: "ucan" },
            { phase: "delegate-r", label: "Delegate Researcher", activeNodes: ["ucan", "researcher"], activeConnections: ["ucan-r"], logPrefix: "UCAN", logMessage: "Delegating 'research' task to Researcher agent...", inspectTarget: "researcher" },
            { phase: "delegate-c", label: "Delegate Coder", activeNodes: ["ucan", "coder"], activeConnections: ["ucan-c"], logPrefix: "UCAN", logMessage: "Delegating 'implement' task to Coder agent...", inspectTarget: "coder" },
            { phase: "research", label: "Research Phase", activeNodes: ["researcher", "ipfs"], activeConnections: ["r-ipfs"], logPrefix: "STORE", logMessage: "Researcher writing findings to shared memory..." },
            { phase: "code", label: "Coding Phase", activeNodes: ["coder", "ipfs"], activeConnections: ["c-ipfs"], logPrefix: "STORE", logMessage: "Coder reading research + writing implementation..." },
            { phase: "sync", label: "Sync Task Board", activeNodes: ["ipfs", "registry"], activeConnections: ["ipfs-reg"], logPrefix: "AGENT", logMessage: "All results synced to task board", inspectTarget: "registry" },
            { phase: "done", label: "Task Complete", activeNodes: ["manager"], activeConnections: [], logPrefix: "INFO", logMessage: "✅ Multi-agent task complete. 2 sub-agents contributed." },
        ],
    },
];

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PLAYGROUND COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export default function SimulationPlayground() {
    const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [logPaused, setLogPaused] = useState(false);
    const [inspectedNode, setInspectedNode] = useState<InspectedNode | null>(null);
    const [terminalOpen, setTerminalOpen] = useState(true);
    const [terminalHeight, setTerminalHeight] = useState(200);
    const [params, setParams] = useState<SimParams>({
        ucanExpiry: 24,
        networkLatency: 500,
        encryptionEnabled: true,
        gatewayFailure: false,
        agentCount: 2,
    });

    const logCounter = useRef(0);

    const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId) || null;
    const totalSteps = activeScenario?.steps.length || 0;

    /* ─── Log Helper ─────────────────────────────────────────────────── */
    const addLog = useCallback((prefix: string, message: string) => {
        if (logPaused) return;
        const now = new Date();
        const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        setLogs((prev) => [
            ...prev,
            { id: logCounter.current++, timestamp: ts, prefix, message, color: getLogColor(prefix) },
        ]);
    }, [logPaused]);

    /* ─── Simulation Runner ──────────────────────────────────────────── */
    useEffect(() => {
        if (!isRunning || !activeScenario || currentStep < 0) return;
        if (currentStep >= totalSteps) {
            setIsRunning(false);
            return;
        }

        const step = activeScenario.steps[currentStep];
        addLog(step.logPrefix, step.logMessage);

        // Auto-inspect if step has a target
        if (step.inspectTarget) {
            const node = activeScenario.nodes.find((n) => n.id === step.inspectTarget);
            if (node) {
                setInspectedNode({
                    id: node.id,
                    type: node.type,
                    label: node.label,
                    did: node.did,
                    cid: node.cid,
                    capabilities: node.capabilities,
                    expiry: node.expiry,
                    encryptionType: node.encryptionType,
                    gatewayMs: node.gatewayMs,
                    rawJson: node as any,
                });
            }
        }

        const timer = setTimeout(() => {
            if (currentStep < totalSteps - 1) {
                setCurrentStep((s) => s + 1);
            } else {
                setIsRunning(false);
            }
        }, params.networkLatency + 800);

        return () => clearTimeout(timer);
    }, [isRunning, currentStep, activeScenario, totalSteps, params.networkLatency, addLog]);

    /* ─── Handlers ───────────────────────────────────────────────────── */
    const handleSelectScenario = (id: string) => {
        setActiveScenarioId(id);
        setCurrentStep(-1);
        setIsRunning(false);
        setInspectedNode(null);
        addLog("SYSTEM", `Selected scenario: ${SCENARIOS.find((s) => s.id === id)?.name}`);
    };

    const handleRun = () => {
        if (!activeScenarioId) return;
        setCurrentStep(0);
        setIsRunning(true);
        addLog("SYSTEM", "▶ Simulation started");
    };

    const handleReset = () => {
        setCurrentStep(-1);
        setIsRunning(false);
        setInspectedNode(null);
        addLog("SYSTEM", "↻ Simulation reset");
    };

    const handleNodeClick = (nodeId: string) => {
        if (!activeScenario) return;
        const node = activeScenario.nodes.find((n) => n.id === nodeId);
        if (!node) return;
        setInspectedNode({
            id: node.id,
            type: node.type,
            label: node.label,
            did: node.did,
            cid: node.cid,
            capabilities: node.capabilities,
            expiry: node.expiry,
            encryptionType: node.encryptionType,
            gatewayMs: node.gatewayMs,
            rawJson: node as any,
        });
        addLog("INFO", `Inspecting node: ${node.label}`);
    };

    const handleStepChange = (index: number) => {
        setCurrentStep(index);
        setIsRunning(false);
        if (activeScenario) {
            const step = activeScenario.steps[index];
            if (step) addLog("INFO", `Jumped to step ${index + 1}: ${step.label}`);
        }
    };

    return (
        <div className="mc-playground">
            <SimSidebar
                scenarios={SCENARIOS}
                activeScenario={activeScenarioId}
                isRunning={isRunning}
                params={params}
                onSelectScenario={handleSelectScenario}
                onRunSimulation={handleRun}
                onResetSimulation={handleReset}
                onParamsChange={setParams}
            />
            <div className="mc-main">
                <div className="mc-main-top" style={{ flex: 1, minHeight: 0 }}>
                    <SimCanvas
                        scenario={activeScenario}
                        currentStepIndex={Math.max(0, currentStep)}
                        totalSteps={totalSteps}
                        isRunning={isRunning}
                        onNodeClick={handleNodeClick}
                        onStepChange={handleStepChange}
                    />
                    <SimInspector node={inspectedNode} />
                </div>
                <SimTerminal
                    logs={logs}
                    onClear={() => setLogs([])}
                    isPaused={logPaused}
                    onTogglePause={() => setLogPaused((p) => !p)}
                    isOpen={terminalOpen}
                    onToggleOpen={() => setTerminalOpen((o) => !o)}
                    height={terminalHeight}
                    onHeightChange={setTerminalHeight}
                />
            </div>
        </div>
    );
}
