# 🏗️ AgentDB: The Three-Pillar Architecture Deep Dive

## System Overview

AgentDB is a tightly integrated system of three orthogonal subsystems that work together to provide permanent, verifiable, and sovereign agent memory:

```
┌────────────────────────────────────────────────────────────────┐
│                      AI AGENT RUNTIME                          │
│                  (LangChain, OpenClaw, Custom)                 │
└────────┬─────────────────────────────────────┬────────┬────────┘
         │                                     │        │
    ┌────▼────────┐                      ┌────▼──┐   ┌─▼──────┐
    │  IDENTITY   │                      │STORAGE│   │SECURITY│
    │   LAYER     │                      │ LAYER │   │ LAYER  │
    │  (UCAN)     │                      │(IPFS) │   │(Crypto)│
    └─────────────┘                      └───────┘   └────────┘
         │                                     │        │
    Ed25519 DIDs             Storacha + IPNS    X25519 + ECIES
    Capability Tokens        Gateway Racing     AES-256-GCM
    Zero-Trust Proof         CIDv1 Hashing      Private Memory
```

---

## 🤖 Pillar 1: Identity & Authorization (UCAN Layer)

### Purpose
Every agent is uniquely identified using cryptographic web standards. This layer handles:
- **Agent Creation**: DIDs are generated deterministically from seeds
- **Permission Delegation**: Agents issue UCANs (User Controlled Authorization Network) tokens
- **Zero-Trust Verification**: All access is proven mathematically, not through databases

### Technical Stack

**Ed25519 DIDs (Decentralized Identifiers)**
```
DID Format: did:key:z6Mk[base36-encoded-public-key]

Example: did:key:z6MkhaXgBZDvotzL8L5aqLMHaiUsSEZXeknady2esxu23eP

Properties:
- Deterministic from seed
- No registration required
- Universally verifiable
- Self-sovereign (agent controls private key)
```

### How It Works: Agent B Delegates to Agent A

**Step 1: Agent B Creates a UCAN**
```typescript
const ucan = await UcanService.delegate(
  { did: () => agentBDid },           // Issuer (Agent B)
  { did: () => agentADid },           // Audience (Agent A)
  { namespace: 'agent', action: 'read' },  // Capability
  { ttl: 86400 }                      // Valid for 24 hours
);
// Returns: eyJhbGc...JWT-like token
```

**Step 2: Agent B Publishes the UCAN**
```typescript
// Option A: Publish to IPFS (peer-to-peer)
const tokenCid = await ipfs.add(ucan);
await agent.publishUcan({ cid: tokenCid, recipient: agentADid });

// Option B: Send directly via API/WebSocket
```

**Step 3: Agent A Verifies and Uses It**
```typescript
const verified = await UcanService.verifyDelegation(ucan);
// verified = {
//   issuer: "did:key:z6Mk...AgentB",
//   audience: "did:key:z6Mk...AgentA",
//   capability: "agent/read",
//   isValid: true,
//   expiresAt: 1710345600
// }

// Now Agent A can access Agent B's memory
const memoryData = await agent.retrieveMemory(memoryCid, { proof: ucan });
```

### Security Properties

- **Non-Repudiation**: Agent B cannot deny issuing the UCAN (signed with private key)
- **Time-Bound**: UCANs expire automatically
- **Scope-Limited**: Each UCAN grants only specific capabilities
- **Revocable**: Agent B can issue a new IPNS entry marking certain UCANs as revoked

---

## 💾 Pillar 2: Storage & Retrieval (IPFS/Storacha Layer)

### Purpose
Permanent, decentralized storage ensuring agent memory is:
- **Immutable**: Once pinned, data cannot be changed (content-addressed)
- **Permanent**: Backed by Filecoin for 300+ year durability
- **Accessible**: Available globally via IPFS gateways at sub-second latency

### Technical Stack

**IPFS + Storacha:**
- IPFS: Content-addressed peer-to-peer file system
- Storacha: Hot storage provider (keeps data online)
- Filecoin: Long-term archival (retrieval guarantee)

**Performance Characteristics:**
```
Local Cache Hit:        ~5ms
Gateway Cache Hit:      ~50ms
Cold IPFS Retrieval:    ~200-500ms (with gateway racing)

Typical Agent Session:  100-500 KB
Multi-Agent Knowledge:  1-100 MB
Full RAG Corpus:        100MB-1TB
```

### How Storage Works: Session Lifecycle

**Session 1: Agent Thinks and Stores**
```typescript
const session = {
  uuid: "sess_20260312_abc123",
  agentDid: "did:key:z6Mk...",
  messages: [
    { role: "user", content: "Analyze Q1 earnings", timestamp: 1710307200 },
    { role: "assistant", content: "Apple Q1: Revenue $119.6B...", timestamp: 1710307230 }
  ],
  semanticIndex: [
    { topic: "financial-analysis", relevance: 0.95, cid: "bafy123..." },
    { topic: "earnings-insights", relevance: 0.87, cid: "bafy456..." }
  ],
  createdAt: 1710307200,
  updatedAt: 1710307290
};

// Store to IPFS
const sessionCid = await StorachaService.store(session);
// sessionCid = "bafy2bzacedaglpyasdx5yb4q3nz3v4q5u2g2e7k8h9i0j1k2l3m4n5o6p7q8r9s"

// Update agent's session registry (mutable pointer)
const agentIpnsName = deriveIpnsFromSeed(AGENT_SEED);
const registry = {
  sessions: {
    "sess_20260312_abc123": sessionCid,
    "sess_20260311_xyz999": "bafy2bzaca...",
    // ... previous sessions
  },
  updatedAt: 1710307290
};
await StorachaService.updateMutablePointer(agentIpnsName, registry);
```

**Session 2: Agent Resumes from Different Device**
```typescript
// New device, same seed
const agentIpnsName = deriveIpnsFromSeed(AGENT_SEED); // Same!
const registry = await ipns.resolve(agentIpnsName);
// registry = { sessions: {...}, updatedAt: 1710307290 }

// Load specific session
const sessionCid = registry.sessions["sess_20260312_abc123"];
const session = await StorachaService.retrieve(sessionCid);
// ✅ Perfect continuity. Agent remembers everything.
```

### Gateway Racing Strategy

Because IPFS can have latency, AgentDB implements competitive retrieval:

```typescript
// Fetch from multiple gateways in parallel
const gateways = [
  "https://storacha.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://w3s.link/ipfs/",
  "https://gateway.pinata.cloud/ipfs/"
];

const promises = gateways.map(gw => 
  fetch(`${gw}${cid}`)
    .then(r => r.json())
    .catch(() => Promise.reject("timeout"))
);

// First gateway to respond wins
const data = await Promise.race(promises);
// Typical response time: 200-300ms (vs 500ms+ with single gateway)
```

### IPNS: The Mutable Pointer

While IPFS content is immutable (CIDs never change), agents need stable mutable pointers. IPNS solves this:

```
Agent Seed: "0x1234567890abcdef"
    ↓
Ed25519 Private Key (derived)
    ↓
Ed25519 Public Key
    ↓
IPNS Name: /ipns/k2k4r8... (deterministic)
    ↓
Can point to different CIDs over time:
  [2026-03-12]: bafy2bzacacvwf2q...  (first session registry)
  [2026-03-13]: bafy2bzacaeif3q...   (updated session registry)
  [2026-03-14]: bafy2bzacakpq9w...   (latest session registry)

Resolution: /ipns/k2k4r8 → bafy2bzacakpq9w (always points to latest)
```

---

## 🔐 Pillar 3: Security & Privacy (Cryptography Layer)

### Purpose
Ensure agent memory is:
- **Private**: Encrypted so only authorized parties can read
- **Authenticated**: Data integrity is cryptographically proofs
- **Delegable**: Authorized parties can decrypt without exposing keys

### Technical Stack

**X25519 Elliptic Curve Cryptography**
- Used for key agreement (Diffie-Hellman)
- Fast and secure (based on Curve25519)
- Standard for modern protocols (Signal, WireGuard)

**ECIES (Elliptic Curve Integrated Encryption Scheme)**
- Combines X25519 with symmetric encryption
- Generates ephemeral keys for each encryption
- Prevents known-plaintext attacks

**AES-256-GCM**
- Authenticated encryption
- Provides both confidentiality and integrity
- Detects tampering

### How Encryption Works

**Private Memory Storage (by Owner)**
```typescript
const sensitiveData = {
  apiKeys: { openai: "sk-proj-...", anthropic: "sk-..." },
  strategicInsights: "Buy tech stocks during Q2 dip",
  personalNotes: "Do not use real names in conversations"
};

// Encrypt using agent's own public key
const encryptedData = await EncryptionService.encrypt(
  sensitiveData,
  agentPublicKey  // X25519 public key
);
// encryptedData = {
//   ephemeralPublicKey: "0x1234...",  // Ephemeral key for this encryption
//   ciphertext: "AES-256-GCM encrypted...",
//   tag: "authentication tag...",
//   nonce: "random nonce..."
// }

// Store on IPFS (encrypted)
const cid = await StorachaService.store(encryptedData);
// cid = "bafy2bzacaXXXX..."

// Later, agent decrypts (using its private key)
const decrypted = await EncryptionService.decrypt(
  encryptedData,
  agentPrivateKey  // Only this key can decrypt
);
```

**Delegated Private Memory (Agent A gives key to Agent B)**

```typescript
// Agent A wraps the decryption key in a UCAN for Agent B
const decryptionPath = {
  memoryCid: "bafy2bzacaXXXX...",
  derivedKey: wrappedKey,  // Agent B can use this to decrypt
  ttl: 86400  // Valid for 24 hours
};

const ucan = await UcanService.delegate(
  { did: () => agentADid },
  { did: () => agentBDid },
  { namespace: 'agent', action: 'read', resource: memoryCid },
  { ttl: 86400 }
);

// Agent B can now:
// 1. Fetch the encrypted data: bafy2bzacaXXXX...
// 2. Use the UCAN-provided key to decrypt it
const data = await agent.decryptWithUcan(memoryCid, ucan);
```

### Security Against Attacks

| Attack | Defense |
|--------|---------|
| **Eavesdropping** | AES-256-GCM encryption |
| **Tampering** | GCM authentication tag (detects modification) |
| **Replay Attacks** | Nonce in every encryption (makes repeats invalid) |
| **Key Compromise** | Ephemeral keys (new key for each encryption) |
| **Unauthorized Access** | X25519 key agreement + UCAN delegation checks |
| **History Rewriting** | Content-addressed IPFS (CID changes if data changes) |

---

## 🔄 How the Three Pillars Work Together

### Complete Agent Memory Lifecycle

**Hour 1: Agent A Researches Topic**
```
Agent A (Finance Analyst)
  ↓ Thinks & Reasons
  ↓ Stores memory to IPFS (Pillar 2)
  ├─ Public memory: bafy1... (anyone can read)
  └─ Private memory: encrypted, stored as bafy2...
  ↓ Updates IPNS registry (Pillar 2, mutable pointer)
  ↓ /ipns/k2k4r8 → points to latest registry
```

**Hour 2: Agent A Delegates Access to Agent B**
```
Agent A → Issues UCAN to Agent B (Pillar 1)
  Capability: "read memory from session X"
  TTL: 24 hours
  Signed: with Agent A's private key

Agent B Receives UCAN
  ↓ Verifies cryptographic signature (Pillar 1)
  ↓ Checks expiration
  ↓ Retrieves CID from Agent A's IPNS registry (Pillar 2)
  ↓ Fetches encrypted data (Pillar 2, gateway racing)
  ↓ Uses UCAN to decrypt (Pillar 3, key delegation)
  ↓ Reads Agent A's insights
  ↓ Agent A's context is now available to Agent B
```

**Hour 3: Agent B Continues the Work on Different Infrastructure**
```
Agent B moves to Cloud Provider B
  ↓ Same seed, derived DID, same IPNS endpoint
  ↓ Resolves Agent B's IPNS → gets latest registry
  ↓ Loads all previous work + Agent A's insights
  ↓ Continues reasoning without context loss
```

---

## 📊 Architectural Properties

| Property | Mechanism | Benefit |
|----------|-----------|---------|
| **Permanence** | IPFS + Filecoin (300y durability) | Agent memory isn't lost to bit rot or hardware failure |
| **Decentralization** | P2P IPFS storage | No single point of failure |
| **Privacy** | X25519 + AES-256-GCM encryption | Sensitive data stays encrypted even on public IPFS |
| **Auditability** | Content-addressed immutability | Cryptographic proof of data integrity |
| **Scalability** | Gateway racing + Storacha | Sub-second retrieval for millions of sessions |
| **Sovereignty** | Agent controls keys and UCAN delegation | No central authority can revoke memory access |
| **Interoperability** | Standard protocols (IPFS, UCAN, Ed25519) | Works with any decentralized system |

---

## 🚀 Performance Targets

- **Session Storage**: 100KB → IPFS in ~100ms
- **Session Retrieval**: ~300ms (gateway racing)
- **Encryption/Decryption**: ~10ms per 10MB
- **UCAN Generation**: ~5ms
- **UCAN Verification**: ~2ms
- **Concurrent Agents**: Tested with 1000+ agents updating in parallel

---

## 🔮 Future Extensions

### Pillar 1 (Identity) Extensions
- **Multi-signature DIDs**: Agents controlled by multiple signers
- **Hierarchical DIDs**: Parent agent → child agent relationships
- **Time-locked Capabilities**: UCANs that only activate at specific times

### Pillar 2 (Storage) Extensions
- **Selective Sharding**: Store large memories across multiple providers
- **Proof-of-Archival**: Cryptographic proof that Filecoin stored the data
- **Versioning**: Keep full history of all agent memory mutations

### Pillar 3 (Security) Extensions
- **Threshold Encryption**: Secret splits across N parties (M-of-N recovery)
- **Homomorphic Encryption**: Compute on encrypted data without decryption
- **Post-Quantum Cryptography**: Replace X25519 with quantum-resistant schemes

