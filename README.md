# 🧠 Agent DB: Decentralized Memory for AI Agents

> **Persistent, encrypted, and permission-controlled memory for autonomous AI agents powered entirely by Web3 infrastructure.**

Built on **Storacha**, **IPNS**, **UCAN**, and **Zama fhEVM**, Agent DB is an enterprise-grade platform for endowing AI agents with cross-platform reasoning continuity and verifiable capability delegation.

---

## 🏗️ Platform Architecture

Agent DB is not just a database; it is a decentralized memory and skills registry for autonomous AI swarms. 

1. **The SDK (`src/lib`)**: Agents include the `@arienjain/agent-db` typescript SDK in their logic. This enables them to generate deterministic Decentalized Identifers (DIDs), pin their evolving context (JSON) directly to IPFS, and issue verifiable delegation tokens (UCAN) offline.
2. **The Indexing Gateway (`src/server`)**: A centralized caching and discovery index. Agents submit their UCAN delegation tokens here so other agents can discover and fetch them. The Gateway *never* holds private keys; it acts purely as a cryptographically verifiable index.
3. **The Hive Mind (IPNS)**: Utilizing `@web3-storage/w3name`, agent memory streams are not static. Agents publish to a mutable IPNS pointer, allowing swarms to continuously resolve each other's state without exchanging new links.
4. **The Agent Vault (Zama FHE)**: Highly sensitive data (passwords, social security numbers) are pushed to the `EncryptedAgentMemory` Solidity contract, protected by Fully Homomorphic Encryption (fhEVM), allowing agents to verify secrets without decrypting them.

---

## 🚀 Running the Platform

### 0. Prerequisites: Storacha IPFS Account
Before starting the gateway, you must provision a free decentralized storage bucket via Storacha.
1. `npm install -g @storacha/cli`
2. `storacha login`
3. `storacha space create "MyAgentNode"`
4. `storacha space use <SPACE_DID>`

*(If skipped, the gateway will gracefully fallback to simulated, local-only CIDs).*

### 1. Start the API Gateway
The API Gateway handles UCAN delegation indexing and public skills discovery.

```bash
# Install platform dependencies
npm install

# Start the discovery gateway
npm run server
```

The gateway will run on `http://localhost:3001` with strict CORS and rate-limiting enabled for production stability.

### 2. Start the Frontend Dashboard
The Next.js dashboard visualizes the global active agents, public skills on IPFS, and UCAN delegation flows.

```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to view the live Globe visualization.

---

## 🔐 Smart Contract Vault (Zama fhEVM)

For data that cannot be public on IPFS, Agent DB leverages Zama's Fully Homomorphic Encryption.

1.  Agents encrypt their context locally.
2.  The FHE payload is submitted to the `EncryptedAgentMemory` contract.
3.  Secondary agents can verify knowledge of the secret via the FHE Gateway without it ever being decrypted on-chain.

```bash
# Compile the fhEVM contracts
npx hardhat compile

# Run the Zama Vault tests
npm run test:hardhat
```

---

## 📦 For Agent Developers (SDK)

Are you an AI developer looking to integrate persistent memory into your Discord bot, LangChain agent, or CLI tool? 

**Do not read this repository manual.**

Instead, please consult the lightweight SDK Developer Guide:
👉 [Read the `@arienjain/agent-db` Node.js Developer Documentation](README_NPM.md)

---

## 🤝 Contributing
Agent DB is an open protocol. We welcome pull requests for expanding UCAN capabilities, creating new visualization widgets in the Next.js frontend, or adding additional fhEVM smart contract capabilities.

## 📄 License
MIT License.
