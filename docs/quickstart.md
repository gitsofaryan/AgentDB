# 🚀 AgentDB: Implementation Quick Start

This guide provides step-by-step instructions to integrate AgentDB into your AI agent system in under 15 minutes.

---

## Prerequisites

- Node.js 18+
- npm or yarn
- TypeScript compiler (optional but recommended)
- Storacha account (free tier available at https://storacha.dev)

---

## Installation

```bash
npm install @arienjain/agent-db
```

---

## Part 1: Basic Setup (5 minutes)

### Step 1: Create Agent Identity

```typescript
import { AgentRuntime } from '@arienjain/agent-db';

// Option A: Generate new agent
const agent = await AgentRuntime.create({
  name: "ResearchBot",
  version: "1.0"
});

console.log(`Agent Identity (DID): ${agent.did}`);
// Output: did:key:z6MkhaXgBZDvotzL8L5aqLMHaiUsSEZXeknady2esxu23eP

// Save this seed (keep it secret!)
const seed = agent.seed;
console.log(`Agent Seed (STORE SAFELY): ${seed}`);

// Option B: Recover from existing seed
const recoveredAgent = await AgentRuntime.loadFromSeed(seed);
console.log(`Agent recovered: ${recoveredAgent.did === agent.did}`); // true
```

### Step 2: Store Public Memory

```typescript
// Your agent thinks and produces insights
const insight = {
  timestamp: Date.now(),
  type: "market-analysis",
  topic: "AI stocks",
  findings: "Tech stocks outperform when Fed is dovish",
  confidence: 0.92,
  data_sources: ["SEC filings", "FOMC minutes"],
  next_action: "Monitor Fed communications"
};

// Store to decentralized web
const cid = await agent.storePublicMemory(insight);
console.log(`Memory stored at: ${cid}`);
// Output: bafy2bzacedy24inygmhyuqqqv2rmmyeqgcjhxmyq5w4emvq56gdogx7qehx2

// Later, retrieve it
const retrieved = await agent.retrievePublicMemory(cid);
console.log("Retrieved insight:", retrieved);
```

### Step 3: Update Agent Registry

```typescript
// Create a "home directory" for the agent (IPNS - mutable pointer)
// This is derived from the seed and always resolves to the latest state

// Register this session
await agent.updateRegistry({
  sessions: {
    "market-analysis-001": cid  // Map session name to content CID
  }
});

// Later, on a different device with same seed
const agent2 = await AgentRuntime.loadFromSeed(seed);
const registry = await agent2.resolveRegistry();
const latestCid = registry.sessions["market-analysis-001"];
const data = await agent2.retrievePublicMemory(latestCid);
// ✅ Perfect recovery! Data is synchronized.
```

---

## Part 2: Agent Collaboration (5 minutes)

### Step 4: Delegate Access to Another Agent

```typescript
// Agent A (Researcher) delegates to Agent B (Analyst)

// A: Get B's DID (normally via discovery or direct sharing)
const agentBDid = "did:key:z6MkSample123..."; // Agent B's identity

// A: Issue a capability delegation
const ucan = await agentA.delegateTo(
  { did: () => agentBDid },
  'agent/read',  // Capability
  { ttl: 86400 }  // Valid for 24 hours
);

console.log(`UCAN Generated:\n${ucan}`);

// A: Publish the UCAN so B can find it
// Option 1: Store on IPFS
const ucanCid = await agentA.publishUcan(ucan);
console.log(`UCAN published at: ${ucanCid}`);

// Option 2: Send directly to B (API, message, etc.)
await sendToAgentB(ucan);
```

### Step 5: Agent B Receives and Uses Delegation

```typescript
// B: Receive the UCAN from A
const ucan = await receiveFromAgentA(); // or retrieve from IPFS

// B: Verify the UCAN is legitimate
const verified = await agentB.verifyUcan(ucan);
console.log(`UCAN valid: ${verified.isValid}`);
console.log(`Expires: ${new Date(verified.expiresAt)}`);

// B: Use the UCAN to read A's memory
const memoryCid = "bafy2bzacedy24..."; // CID from A's registry

const data = await agentB.retrievePublicMemory(memoryCid, { ucan });
console.log("A's insight accessed by B:", data);

// B: Can now build on A's work
const extendedInsight = {
  ...data,
  extension: "Also observed in crypto markets",
  credits: "Based on analysis by Agent A (delegated access)"
};

const newCid = await agentB.storePublicMemory(extendedInsight);
```

---

## Part 3: Private Memory (3 minutes)

```typescript
// For sensitive data (API keys, private strategies, etc.)

// Store encrypted memory
const sensitiveData = {
  api_keys: {
    openai: process.env.OPENAI_KEY,
    anthropic: process.env.ANTHROPIC_KEY
  },
  private_strategy: "Buy dip in specific token",
  model_weights: [...]
};

// Encrypt and store
const privateCid = await agent.storePrivateMemory(sensitiveData);
console.log(`Private memory stored (encrypted): ${privateCid}`);

// Later, retrieve and decrypt (only this agent can read it)
const decrypted = await agent.retrievePrivateMemory(privateCid);
console.log("API keys recovered:", decrypted.api_keys);

// Grant another agent access to ONE specific private memory
const agentBDid = "did:key:z6Mk...";
const privateUcan = await agent.delegatePrivateMemory(
  privateCid,
  { did: () => agentBDid }
);

// Agent B can now
const bPrivateData = await agentB.retrievePrivateMemory(privateCid, { ucan: privateUcan });
```

---

## Part 4: Using with LangChain (Optional)

```typescript
import { AgentRuntime } from '@arienjain/agent-db';
import { OpenAI } from 'langchain/llms/openai';
import { ConversationChain } from 'langchain/chains';

// Create LangChain agent with AgentDB memory backend
const agent = await AgentRuntime.loadFromSeed(process.env.AGENT_SEED);

const memory = await agent.createLangChainMemory({
  sessionName: "investment-analysis",
  maxMessages: 50
});

const llm = new OpenAI();
const chain = new ConversationChain({ llm, memory });

// Every message is automatically stored to IPFS
const response = await chain.call({
  input: "Analyze AAPL stock performance"
});

// Memory is persisted to IPFS
// On restart, it'll be automatically recovered
```

---

## Part 5: LangChain with OpenClaw Integration

```typescript
import { AgentRuntime } from '@arienjain/agent-db';
import { OpenClawAgent } from 'openclaw';

// Create agent with persistent persona
const agent = await AgentRuntime.loadFromSeed(process.env.AGENT_SEED);
const openclaw = new OpenClawAgent();

// Load or create persona
let persona = await agent.retrievePersona("trader-agent");
if (!persona) {
  persona = {
    name: "Quantbot",
    role: "Financial Analyst",
    expertise: ["technical analysis", "sentiment analysis"],
    personality: "Data-driven, analytical, risk-aware",
    learned_preferences: {}
  };
  await agent.storePersona("trader-agent", persona);
}

// Run agent with persistent persona
const result = await openclaw.run({
  prompt: "What stocks should I buy?",
  persona
});

// Save updated persona after learning
persona.learned_preferences.risk_level = result.riskAssessment;
await agent.storePersona("trader-agent", persona);
```

---

## Debugging & Monitoring

### View Agent State

```typescript
const agent = await AgentRuntime.loadFromSeed(seed);

// View all sessions
const registry = await agent.resolveRegistry();
console.log("All sessions:", Object.keys(registry.sessions));

// View specific session
const sessionCid = registry.sessions["market-analysis-001"];
const sessionData = await agent.retrievePublicMemory(sessionCid);
console.log("Session data:", JSON.stringify(sessionData, null, 2));

// View encryption keys
console.log("Agent public key:", agent.publicKey);
console.log("Agent DID:", agent.did);
```

### Performance Monitoring

```typescript
const start = Date.now();
const data = await agent.retrievePublicMemory(cid);
const latency = Date.now() - start;
console.log(`Retrieval took ${latency}ms`);

// Check cache hit rate
const stats = agent.getCacheStats();
console.log(`Cache hit rate: ${(stats.hitRate * 100).toFixed(2)}%`);
```

---

## Error Handling

```typescript
try {
  const data = await agent.retrievePublicMemory(badCid);
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    console.error('CID not found on IPFS');
  } else if (error.code === 'NETWORK_ERROR') {
    console.error('All IPFS gateways unavailable');
  } else if (error.code === 'DECRYPTION_ERROR') {
    console.error('Could not decrypt private memory');
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Example: Complete Multi-Agent System

```typescript
import { AgentRuntime } from '@arienjain/agent-db';

async function createMultiAgentSystem() {
  // 1. Create two agents
  const researcherAgent = await AgentRuntime.loadFromSeed(RESEARCHER_SEED);
  const analystAgent = await AgentRuntime.loadFromSeed(ANALYST_SEED);

  // 2. Researcher analyzes a topic
  const research = {
    topic: "AI scaling laws",
    findings: "Loss scales as 1/N^0.07 where N=params",
    sources: 50,
    confidence: 0.95
  };

  const researchCid = await researcherAgent.storePublicMemory(research);
  
  // 3. Researcher delegates to analyst
  const ucan = await researcherAgent.delegateTo(
    { did: () => analystAgent.did },
    'agent/read',
    { ttl: 7 * 86400 }  // Valid for 1 week
  );

  // 4. Analyst uses researcher's findings
  const researchData = await analystAgent.retrievePublicMemory(researchCid, { ucan });
  
  // 5. Analyst builds on it
  const analysis = {
    basedOn: researchCid,
    insight: "Implications for model deployment strategy",
    recommendation: "Favor 30B models over 7B for cost/performance",
    timestamp: Date.now()
  };

  const analysisCid = await analystAgent.storePublicMemory(analysis);

  // 6. Both agents' work is permanently stored, verifiable, and transparent
  console.log(`Research stored at: ${researchCid}`);
  console.log(`Analysis stored at: ${analysisCid}`);
  console.log(`Full audit trail preserved on IPFS`);
}

createMultiAgentSystem();
```

---

## Next Steps

1. **Read the docs**: Check out [docs/README.md](../README.md)
2. **Understand the architecture**: [docs/three-pillar-architecture.md](three-pillar-architecture.md)
3. **See use cases**: [docs/use-cases.md](use-cases.md)
4. **Deploy to production**: [docs/performance_guide.md](performance_guide.md)
5. **Join community**: [Discord](https://discord.gg/agentdb)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Agent can't find memory after restart | Check that IPNS resolution works: `await agent.resolveRegistry()` |
| UCAN verification fails | Ensure UCAN hasn't expired and is signed by correct agent |
| IPFS timeout | Implement gateway racing (see performance guide) |
| High memory usage | Reduce cache size or implement tiered storage |
| Slow retrieval | Use gateway racing + local LRU cache |

---

## API Reference Summary

### AgentRuntime

```typescript
// Creation
AgentRuntime.create(config)                 // Create new agent
AgentRuntime.loadFromSeed(seed)             // Load from seed

// Identity
agent.did                                   // Agent DID
agent.seed                                  // Private seed (keep safe!)
agent.publicKey                             // Public key

// Public Memory
agent.storePublicMemory(data)               // Store public data (returns CID)
agent.retrievePublicMemory(cid)             // Retrieve public data

// Private Memory
agent.storePrivateMemory(data)              // Store encrypted data
agent.retrievePrivateMemory(cid)            // Retrieve encrypted data

// Delegation
agent.delegateTo(recipient, capability)    // Issue UCAN capability
agent.verifyUcan(ucan)                      // Verify UCAN token
agent.delegatePrivateMemory(cid, recipient) // Delegate private data access

// Registry
agent.updateRegistry(data)                  // Update IPNS registry
agent.resolveRegistry()                     // Resolve latest registry

// Personas (OpenClaw)
agent.storePersona(id, data)                // Store AI persona
agent.retrievePersona(id)                   // Retrieve AI persona

// LangChain
agent.createLangChainMemory(config)         // LangChain memory backend
```

---

**Happy building! 🚀**

For more examples, see `/demos` folder in the main repo.

