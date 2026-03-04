# Changelog

All notable changes to **Agent DB SDK** are documented here.

## [1.5.0] - 2026-03-05
### Added
- **Decentralized Chat Application**: A full-featured chat interface (`/chat`) where memory is persisted entirely on IPFS/Storacha.
- **Session Registry (IPNS)**: Implemented a decentralized index of all agent sessions using IPNS, allowing state recovery across any device without a central server.
- **Private Memory (ECIES)**: Added military-grade encryption for agent memories using X25519 and AES-256-GCM.
- **UCAN Delegation UI**: Added a "Share" button to issue cryptographically signed read permissions to other agents via IPFS.
- **Premium Documentation Hub**: Revamped the `/get-started` page with 14 detailed steps covering the entire 39-method SDK.
- **Architecture Overview**: Added high-level documentation for Identity, Storage, Privacy, and Coordination layers.
- **Landing Page CTA**: Added a primary "Try Decentralized Chat" button to the hero section for direct SDK demonstration.

### Fixed
- **IPFS Propagation Delay**: Implemented a write-through cache and local file fallback in `StorachaService` to eliminate the delay when fetching freshly pinned CIDs.
- **Chat Layout Stability**: Overhauled CSS for the chat page to ensure pinned headers, footers, and scrollable sidebars work perfectly even with 100+ active chats.
- **Encrypted Memory Recovery**: Fixed the backend `recover` logic to auto-detect and decrypt private memory payloads.
- **SDK Type Safety**: Resolved all linting issues and ensured proper `tsup` build exports for all 39 SDK methods.

## [1.4.1] - 2026-03-03
### Fixed
- **NPM Publish**: Resolved version conflict for re-publishing.

## [1.4.0] - 2026-03-02
### Added
- **Model Context Protocol (MCP)**: Implemented full server with tools for memory storage, encryption, and delegation.
- **Premium Documentation Website**: Launched futuristic, responsive docs hub in the `/docs` folder.
- **Claude Desktop Support**: Added standard configuration for easy LLM integration.

## [1.3.0] - 2026-03-02
### Added
- **ECIES Encryption (`src/lib/encryption.ts`)**: Implemented ECIES with NIST P-256 for secure, large-payload private memory on IPFS.
- **File-Based Persistence**: Upgraded `StorachaService` to cache memory blocks in `~/.agent-db/cache`, ensuring data survives agent restarts.
- **Safe IPNS Concurrency**: Added `syncStream()` in `AgentRuntime` to prevent race conditions during collaborative IPNS updates.
- **Runtime Schema Validation**: Integrated `zod` into `storePublicMemory()` to enforce data integrity on agent payloads.
- **Structured Error Handling**: Introduced `ValidationError`, `StorageError`, `AuthenticationError`, and `NetworkError` classes.
- **Hardening Test Suite**: Added `src/test-persistence.ts`, `src/test-encryption.ts`, and `src/test-dx.ts`.

### Changed
- **Version Bump**: Released production-hardened SDK v1.3.0.

## [1.2.0] - 2026-03-01
### Added
- **Hackathon Track Alignment**:
    - **Storacha**: Added `OpenClaw` adapter for persistent agent memory.
    - **Filecoin**: Deployed `AgentRegistry.sol` to Calibration Testnet for decentralized agent discovery.
    - **Zama**: Added `ConfidentialFinance.sol` for FHE-based trade verification.
    - **Lit Protocol**: Integrated Vincent API for autonomous wallet management with guardrails.
- **Demos**: Added `demo:openclaw`, `demo:filecoin`, `demo:defi`, and `demo:lit`.

## [1.1.0] - 2026-02-28
### Added
- **Deterministic Identity**: Gated Ed25519 DIDs behind wallet signatures via `UcanService`.
- **Public Skills Discovery**: Added endpoints and demos for publishing and finding public agent contexts.
- **Sovereign Authorization**: Client-side UCAN signing for zero-server-privilege state updates.

## [1.0.0] - 2026-02-20
### Added
- **Initial Release**: Core `AgentRuntime` with IPFS storage and UCAN authentication.
- **LangChain Integration**: First-class memory adapter for LangChain agents.
