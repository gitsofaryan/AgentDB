# `@arienjain/agent-db` Node.js SDK

> **Decentralized, encrypted, and portable memory for your autonomous AI agents.**

Are your agents losing their long-term reasoning when you restart their containers? `agent-db` solves the "AI Amnesia" problem by turning any standard JavaScript agent into a self-sovereign entity capable of persisting context to the decentralized web (IPFS), privately storing secrets (fhEVM), and granting downstream permissions (UCAN).

## Features

1. **Self-Sovereign Identity**: Your agent gets an Ed25519 `did:key` identity automatically.
2. **Infinite Context**: Save agent knowledge/state continuously mapping to decentralized IPFS identifiers (CIDs).
3. **The Hive Mind (IPNS)**: Subscribe to other agents' mutable memory streams in real-time.
4. **Verifiable Swarm Delegation**: Use UCANs to grant *Agent B* temporary cryptographic permission to read *Agent A's* memory stream without a centralized database.

## Installation

```bash
npm install @arienjain/agent-db
```

*Note: In production deployments, your agent system will need a free email-authenticated Storacha (Filecoin/IPFS) space to persist the files. During testing, it gracefully simulates IPFS CIDs locally.*

## Core API Reference

### 1. Initialize an Agent Identity

Agents do not need a username or password. They generate their own Ed25519 keys locally on initialization. 

```typescript
import { AgentRuntime } from '@arienjain/agent-db';

async function runSwarms() {
    // Agent identity generated instantly, keys stay offline.
    const agent = await AgentRuntime.create();
    console.log("Agent DID:", agent.identity.did());
}
runSwarms();
```

### 2. Static Memory (CIDs)

Take any JSON object (the agent's context window, reasoning step, or action log) and pin it.

```typescript
const context = {
    task: "Analyze financial markets",
    lastAction: "buy BTC",
    reasoning: "Bullish divergence detected."
};

// Store on IPFS. The SDK handles all cryptography asynchronously.
const cid = await agent.storePublicMemory(context);

// Retrieve memory autonomously
const data = await agent.retrievePublicMemory(cid);
```

### 3. The Hive Mind (Continuous Streaming Memory)

Static CIDs require you to send a new hash every time the agent's context updates. Using IPNS, your agent can start a **Memory Stream**. It publishes a single, mutable `IPNS Name` that downstream bots can resolve to continuously view the agent's *latest* thoughts.

```typescript
// Agent A creates an IPFS stream pointer
const ipnsName = await agent.startMemoryStream({ status: "Booting up..." });

// Agent A updates its stream 10 minutes later
await agent.updateMemoryStream({ status: "Found arbitrage execution code" });

// Agent B (on another server entirely) resolves Agent A's stream to the latest state
const latestThoughts = await agentB.fetchMemoryStream(ipnsName);
```

### 4. Zero-Trust Access Delegation (UCAN)

Agent A wants to let Agent B read its private files, but there is no centralized auth server. Agent A generates a **UCAN** (User Controlled Authorization Network) token offline, signing over the `agent/read` capability to Agent B for 24 hours.

```typescript
// 1. Agent A generates a cryptographically signed capability grant
const delegationToken = await agentA.delegateTo(agentB.identity, 'agent/read', 24);

// 2. Agent A sends this JSON object to Agent B via Discord, HTTP, or Websockets.

// 3. Agent B uses this delegation when fetching the memory!
const memory = await agentB.fetchMemoryStream(ipnsName, delegationToken.delegation);
```

## Production Hardening
This SDK is wrapped with `zod` schema verifications, implements exponential backoff network retries via `@storacha/client`, and strips `console.log` statements for clean server outputs. If network connections degrade, standard Node.js `NetworkError` and `ValidationError` objects are surfaced.

## License

MIT License.
