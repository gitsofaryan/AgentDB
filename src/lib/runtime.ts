import { StorachaService } from './storacha.js';
import { UcanService } from './ucan.js';
import { EncryptionService } from './encryption.js';
import { AuthenticationError, ValidationError, StorageError, ConcurrencyError, NetworkError } from './errors.js';
import * as crypto from 'node:crypto';
import { z } from 'zod';

/**
 * AgentRuntime — Unified orchestration layer that ties together
 * Storacha (public memory), UCAN (authorization), and Zama FHE (private vault).
 *
 * Supports two agent-to-agent communication methods:
 *
 * 1. IPFS-Native (Fully Decentralized):
 *    Agent A publishes delegation to IPFS → Agent B fetches via CID
 *
 * 2. REST API Gateway (Web2-Compatible):
 *    Agent A posts delegation to API → Agent B queries API with UCAN token
 */
export class AgentRuntime {
    private signer: any;
    private memoryCids: string[] = [];
    private delegations: Map<string, any> = new Map();
    private receivedDelegations: Map<string, any> = new Map();

    // Hive Mind IPNS State
    public ipnsName: any = null;
    private ipnsRevision: any = null;

    // Decentralized Session Registry (The Root of Memory)
    private rootIpnsName: any = null;
    private rootIpnsRevision: any = null;
    private agentSeed: string | null = null;

    private constructor(signer: any, seed: string | null = null) {
        this.signer = signer;
        this.agentSeed = seed;
    }

    /**
     * Initialize a new agent with a fresh decentralized identity.
     */
    static async create(): Promise<AgentRuntime> {
        const signer = await UcanService.createIdentity();
        return new AgentRuntime(signer);
    }

    /**
     * Initialize an agent deterministically from a seed phrase or environment variable.
     * This guarantees the agent retains the same identity (DID) across server restarts.
     * 
     * @param seed A secure seed string (e.g., process.env.AGENT_SEED)
     */
    static async loadFromSeed(seed: string): Promise<AgentRuntime> {
        const signer = await UcanService.createIdentityFromSeed(seed);
        const agent = new AgentRuntime(signer, seed);
        
        // Derive stable Root IPNS name for the Session Registry
        agent.rootIpnsName = await StorachaService.deriveIpnsName(seed);
        
        return agent;
    }

    /**
     * Initialize an agent from an existing base64 private key.
     */
    static async fromKey(base64Key: string): Promise<AgentRuntime> {
        const signer = await UcanService.getSignerFromBase64(base64Key);
        return new AgentRuntime(signer);
    }

    /**
     * Get this agent's DID (public identifier).
     */
    get did(): string {
        return this.signer.did();
    }

    /**
     * Get the raw signer (for advanced operations).
     */
    get identity(): any {
        return this.signer;
    }

    // ═══════════════════════════════════════════════════════════════════
    // PUBLIC MEMORY (Storacha / IPFS)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Store agent context to IPFS via Storacha.
     * @param context The JSON-serializable context object.
     * @param schema Optional Zod schema for validation.
     * @returns The CID of the stored memory.
     */
    async storePublicMemory(context: object, schema?: z.ZodSchema): Promise<string> {
        try {
            if (schema) {
                const result = schema.safeParse(context);
                if (!result.success) {
                    throw new ValidationError("Memory payload failed validation", result.error);
                }
            }

            const payload = {
                agent_id: this.did,
                timestamp: new Date().toISOString(),
                context,
            };

            const cid = await StorachaService.uploadMemory(payload);
            this.memoryCids.push(cid);
            return cid;
        } catch (err) {
            if (err instanceof ValidationError) throw err;
            throw new StorageError(`Failed to store public memory: ${(err as Error).message}`);
        }
    }

    /**
     * Retrieve agent context from IPFS.
     * If a delegation token is provided, it's verified before granting access.
     *
     * @param cid The CID of the memory to retrieve.
     * @param delegation Optional UCAN delegation token (required if caller is not the owner).
     * @returns The parsed memory object, or null if unauthorized/failed.
     */
    async retrievePublicMemory(
        cid: string,
        delegation?: any
    ): Promise<object | null> {
        try {
            let ucan = delegation;
            if (typeof delegation === 'string') {
                ucan = await UcanService.delegationFromBase64(delegation);
            }

            if (ucan) {
                // Defensive check for the ucan object shape
                const issuer = ucan.issuer || ucan.root?.issuer;
                if (!issuer) {
                    console.error("Malformed UCAN: Missing issuer. Keys:", Object.keys(ucan));
                    throw new AuthenticationError("Malformed UCAN delegation: No issuer found.");
                }

                const expectedIssuer = typeof issuer.did === 'function' ? issuer.did() : issuer.toString();
                const verification = UcanService.verifyDelegation(
                    ucan,
                    expectedIssuer,
                    'agent/read'
                );
                if (!verification.valid) {
                    throw new AuthenticationError(`Authorization denied: ${verification.reason}`);
                }
            }

            const data = await StorachaService.fetchMemory(cid);
            if (!data) {
                throw new StorageError(`Memory CID not found: ${cid}`);
            }
            return data;
        } catch (err) {
            if (err instanceof AuthenticationError) throw err;
            if (err instanceof StorageError) throw err;
            throw new NetworkError(`Failed to retrieve memory: ${(err as Error).message}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PRIVATE MEMORY (ECIES + IPFS)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Derives a stable X25519 encryption keypair from the agent's identity.
     * This uses a signature-based derivation for consistency across restarts.
     */
    private async getEncryptionKey(): Promise<{ publicKey: Buffer; privateKey: Buffer }> {
        // Sign a constant string to get a stable 32-byte seed
        const seedBuffer = Buffer.from("agent-db-x25519-encryption-seed-v1");
        const signature = await this.signer.signer.sign(seedBuffer);
        const seed = crypto.createHash('sha256').update(signature).digest();
        
        // Node.js crypto X25519 PKCS#8 header (30 2e 02 01 00 30 05 06 03 2b 65 6e 04 22 04 20)
        const pkcs8Header = Buffer.from('302e020100300506032b656e04220420', 'hex');
        const spkiHeader = Buffer.from('302a300506032b656e032100', 'hex');

        const privKeyObj = crypto.createPrivateKey({
            key: Buffer.concat([pkcs8Header, seed]),
            format: 'der',
            type: 'pkcs8'
        });

        const pubKeyObj = crypto.createPublicKey(privKeyObj);
        const pubKey = pubKeyObj.export({ format: 'der', type: 'spki' }).slice(spkiHeader.length);

        return {
            publicKey: pubKey as Buffer,
            privateKey: seed
        };
    }

    /**
     * Encrypts and stores private memory on IPFS.
     * Only the owner agent can decrypt this.
     * 
     * @param context The private data.
     * @returns The CID of the encrypted payload on IPFS.
     */
    async storePrivateMemory(context: object): Promise<string> {
        const { publicKey } = await this.getEncryptionKey();

        const encryptedPayload = await EncryptionService.encrypt(
            JSON.stringify(context),
            publicKey
        );

        const cid = await StorachaService.uploadMemory({
            _encrypted: true,
            _encryptionMethod: 'X25519-AES256GCM',
            payload: encryptedPayload
        });

        return cid;
    }

    /**
     * Retrieves and decrypts private memory from IPFS.
     * 
     * @param cid The CID of the encrypted memory.
     * @returns The decrypted JSON object.
     */
    async retrievePrivateMemory(cid: string): Promise<object | null> {
        const data: any = await StorachaService.fetchMemory(cid);
        if (!data || !data._encrypted || !data.payload) {
            throw new Error("Invalid private memory payload or not encrypted.");
        }

        const { privateKey } = await this.getEncryptionKey();

        const decryptedBuffer = await EncryptionService.decrypt(data.payload, privateKey);
        return JSON.parse(decryptedBuffer.toString());
    }

    /**
     * Get all CIDs this agent has stored.
     */
    getStoredCids(): string[] {
        return [...this.memoryCids];
    }

    /**
     * Get a gateway URL for a specific CID.
     */
    getMemoryUrl(cid: string): string {
        return StorachaService.getGatewayUrl(cid);
    }

    // ═══════════════════════════════════════════════════════════════════
    // HIVE MIND: STREAMING MEMORY (IPNS + UCAN)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Starts a mutable memory stream by creating an IPNS name and
     * pinning the initial context to it.
     * @param context The initial memory state.
     * @returns The newly created IPNS Name ID (e.g., "k51qzi5...")
     */
    async startMemoryStream(context: object): Promise<string> {
        // 1. Store the initial memory on IPFS
        const cid = await this.storePublicMemory(context);
        
        // 2. Generate a new IPNS WritableName
        this.ipnsName = await StorachaService.createIpnsName();
        
        // 3. Publish the CID to the new IPNS name
        this.ipnsRevision = await StorachaService.publishToIpns(this.ipnsName, cid);
        
        return this.ipnsName.toString();
    }

    /**
     * Synchronizes the local stream state with the decentralized network.
     * Fetches the latest IPNS revision to prevent "stale revision" errors.
     */
    async syncStream(): Promise<void> {
        if (!this.ipnsName) return;
        
        const latestRevision = await StorachaService.getLatestRevision(this.ipnsName.toString());
        if (latestRevision) {
            this.ipnsRevision = latestRevision;
        }
    }

    /**
     * Updates an existing memory stream with new context.
     * Hardened: Automatically syncs the latest revision before updating to 
     * prevent conflicts in multi-agent environments.
     * 
     * @param newContext The updated memory state.
     * @returns The new underlying IPFS CID it points to.
     */
    async updateMemoryStream(newContext: object): Promise<string> {
        if (!this.ipnsName) {
            throw new Error("Cannot update memory stream: No stream started. Call startMemoryStream() first.");
        }

        // 1. Production Hardening: Sync the latest revision from the network
        // This prevents race conditions if multiple agents/instances are writing to the same stream.
        await this.syncStream();

        // 2. Store the new memory on IPFS
        const newCid = await this.storePublicMemory(newContext);

        // 3. Update the IPNS pointer
        this.ipnsRevision = await StorachaService.publishToIpns(this.ipnsName, newCid, this.ipnsRevision);
        
        return newCid;
    }

    /**
     * Fetches the latest context from another agent's memory stream.
     * This allows Agent B to track Agent A's thought process in real-time.
     * 
     * @param ipnsNameId The IPNS Name ID (e.g., "k51qzi5...")
     * @param delegation Optional UCAN delegation if the underlying memory requires auth
     * @returns The latest memory JSON object, or null.
     */
    async fetchMemoryStream(ipnsNameId: string, delegation?: any): Promise<object | null> {
        // 1. Resolve the IPNS pointer to get the current CID
        const currentCid = await StorachaService.resolveIpns(ipnsNameId);
        if (!currentCid) {
            console.error(`Could not resolve IPNS stream for ${ipnsNameId}`);
            return null;
        }

        // 2. Fetch the memory from the resolved CID
        return await this.retrievePublicMemory(currentCid, delegation);
    }

    // ═══════════════════════════════════════════════════════════════════
    // AUTHORIZATION (UCAN) — Core
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Issue a UCAN delegation to another agent.
     * @param subAgent The signer or identity of the agent receiving permission.
     * @param ability The capability to grant (e.g., 'agent/read', 'agent/write').
     * @param expirationHours How long the delegation is valid (default: 24 hours).
     * @returns The signed UCAN delegation.
     */
    async delegateTo(
        subAgent: any,
        ability: string = 'agent/read',
        expirationHours: number = 24
    ): Promise<any> {
        const delegation = await UcanService.issueDelegation(
            this.signer,
            subAgent,
            ability,
            expirationHours
        );

        const audienceDid = typeof subAgent === 'string' ? subAgent : subAgent.did();
        this.delegations.set(audienceDid, delegation);

        return delegation;
    }

    /**
     * Verify an incoming delegation token.
     * @param delegation The UCAN delegation to verify.
     * @param issuerDid The DID of the agent who issued this delegation.
     * @param requiredAbility The capability that must be present.
     * @returns Verification result with { valid, reason? }
     */
    verifyIncoming(
        delegation: any,
        issuerDid: string,
        requiredAbility: string = 'agent/read'
    ): { valid: boolean; reason?: string } {
        return UcanService.verifyDelegation(delegation, issuerDid, requiredAbility);
    }

    /**
     * Get all active delegations this agent has issued.
     */
    getIssuedDelegations(): Map<string, any> {
        return new Map(this.delegations);
    }

    // ═══════════════════════════════════════════════════════════════════
    // APPROACH 1: IPFS-NATIVE TOKEN SHARING (Fully Decentralized)
    // ═══════════════════════════════════════════════════════════════════
    //
    // Flow:
    // 1. Agent A issues delegation to Agent B
    // 2. Agent A serializes delegation → CAR bytes
    // 3. Agent A publishes CAR bytes to IPFS → gets a tokenCid
    // 4. Agent A shares tokenCid with Agent B (via DNS, ENS, or any channel)
    // 5. Agent B fetches CAR bytes from IPFS using tokenCid
    // 6. Agent B deserializes → gets the original delegation
    // 7. Agent B presents delegation when requesting Agent A's memory

    /**
     * AGENT A: Issue a delegation and publish it to IPFS.
     * Returns the CID that Agent B needs to fetch the delegation.
     *
     * @param subAgent The agent receiving permission.
     * @param ability The capability to grant.
     * @param expirationHours How long the delegation is valid.
     * @returns { delegation, delegationCid, memoryCids }
     */
    async issueAndPublishDelegation(
        subAgent: any,
        ability: string = 'agent/read',
        expirationHours: number = 24
    ): Promise<{ delegation: any; delegationCid: string; memoryCids: string[] }> {
        // Step 1: Issue the delegation
        const delegation = await this.delegateTo(subAgent, ability, expirationHours);

        // Step 2: Serialize to CAR bytes
        const carBytes = await UcanService.serializeDelegation(delegation);

        // Step 3: Publish to IPFS
        const delegationCid = await StorachaService.publishDelegation(carBytes);

        return {
            delegation,
            delegationCid,
            memoryCids: this.getStoredCids(),
        };
    }

    /**
     * AGENT B: Fetch a delegation from IPFS, deserialize, and verify it.
     * Returns the delegation if valid, null if invalid or failed.
     *
     * @param delegationCid The CID where the delegation CAR was published.
     * @param expectedIssuerDid The DID of the agent who should have issued it.
     * @param expectedAbility The capability that should be granted.
     * @returns The verified delegation, or null.
     */
    async fetchAndVerifyDelegation(
        delegationCid: string,
        expectedIssuerDid: string,
        expectedAbility: string = 'agent/read'
    ): Promise<any | null> {
        // Step 1: Fetch CAR bytes from IPFS
        const carBytes = await StorachaService.fetchDelegation(delegationCid);
        if (!carBytes) {
            console.error('Failed to fetch delegation from IPFS');
            return null;
        }

        // Step 2: Deserialize
        const delegation = await UcanService.deserializeDelegation(carBytes);

        // Step 3: Verify
        const result = UcanService.verifyDelegation(delegation, expectedIssuerDid, expectedAbility);
        if (!result.valid) {
            console.error(`Delegation verification failed: ${result.reason}`);
            return null;
        }

        // Step 4: Store for future use
        this.receivedDelegations.set(expectedIssuerDid, delegation);

        return delegation;
    }

    /**
     * AGENT B: Retrieve Agent A's memory using a previously fetched delegation.
     *
     * @param memoryCid The CID of the memory to retrieve.
     * @param issuerDid The DID of Agent A (who issued the delegation).
     * @returns The parsed memory object, or null.
     */
    async retrieveWithDelegation(
        memoryCid: string,
        issuerDid: string
    ): Promise<object | null> {
        const delegation = this.receivedDelegations.get(issuerDid);
        if (!delegation) {
            console.error(`No delegation found for issuer ${issuerDid}`);
            return null;
        }

        // Verify the delegation is still valid (might have expired)
        const result = UcanService.verifyDelegation(delegation, issuerDid, 'agent/read');
        if (!result.valid) {
            console.error(`Delegation no longer valid: ${result.reason}`);
            return null;
        }

        // Fetch memory from IPFS
        return await StorachaService.fetchMemory(memoryCid);
    }

    // ═══════════════════════════════════════════════════════════════════
    // APPROACH 2: REST API GATEWAY (Web2-Compatible)
    // ═══════════════════════════════════════════════════════════════════
    //
    // These methods are used when Agent B communicates through the
    // Context Service API instead of directly with IPFS.

    /**
     * AGENT A: Serialize a delegation to base64 for sharing via REST API.
     *
     * @param delegation The UCAN delegation to serialize.
     * @returns Base64-encoded string ready for HTTP transport.
     */
    async exportDelegationForApi(delegation: any): Promise<string> {
        return await UcanService.delegationToBase64(delegation);
    }

    /**
     * AGENT B: Import a delegation received from the REST API.
     *
     * @param base64Token The base64-encoded delegation string from the API.
     * @param expectedIssuerDid The DID of the expected issuer.
     * @param expectedAbility The capability that should be granted.
     * @returns The verified delegation, or null.
     */
    async importDelegationFromApi(
        base64Token: string,
        expectedIssuerDid: string,
        expectedAbility: string = 'agent/read'
    ): Promise<any | null> {
        try {
            const delegation = await UcanService.delegationFromBase64(base64Token);

            const result = UcanService.verifyDelegation(delegation, expectedIssuerDid, expectedAbility);
            if (!result.valid) {
                console.error(`API delegation verification failed: ${result.reason}`);
                return null;
            }

            this.receivedDelegations.set(expectedIssuerDid, delegation);
            return delegation;
        } catch (err) {
            console.error('Failed to import delegation:', err);
            return null;
        }
    }

    /**
     * AGENT B: Call the Context Service REST API to retrieve memory.
     * Uses the base64 UCAN token as a Bearer token.
     *
     * @param apiBaseUrl The base URL of the Context Service API.
     * @param memoryCid The CID of the memory to retrieve.
     * @param base64Token The base64-encoded UCAN delegation.
     * @returns The parsed memory object, or null.
     */
    async retrieveViaApi(
        apiBaseUrl: string,
        memoryCid: string,
        base64Token: string
    ): Promise<object | null> {
        try {
            const response = await fetch(`${apiBaseUrl}/api/memory/${memoryCid}`, {
                headers: {
                    'Authorization': `Bearer ${base64Token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: response.statusText }));
                console.error(`API returned ${response.status}:`, error);
                return null;
            }

            return await response.json();
        } catch (err) {
            console.error('Failed to retrieve via API:', err);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DECENTRALIZED SESSION REGISTRY (Memory Indexing)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Synchronizes the registry state with the decentralized network.
     * Use this before any update to prevent "stale revision" errors.
     */
    private async syncRegistry(): Promise<void> {
        if (!this.rootIpnsName) return;
        
        const latestRevision = await StorachaService.getLatestRevision(this.rootIpnsName.toString());
        if (latestRevision) {
            this.rootIpnsRevision = latestRevision;
        }
    }

    private async saveRegistry(indexer: Record<string, string>) {
        // 1. Production Hardening: Sync latest state before writing
        await this.syncRegistry();

        // 2. Store the Registry JSON on IPFS
        const cid = await StorachaService.uploadMemory({
            _type: 'agent_registry',
            _agent: this.did,
            index: indexer
        });

        if (this.rootIpnsName) {
            // 3. Update the stable IPNS pointer
            this.rootIpnsRevision = await StorachaService.publishToIpns(this.rootIpnsName, cid, this.rootIpnsRevision);
        }

        // 4. Fallback: Also save locally for offline-first support
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const dir = path.join(process.cwd(), '.agent_storage');
        await fs.mkdir(dir, { recursive: true });
        const safeDid = this.did.replace(/[^a-zA-Z0-9]/g, '_');
        const indexPath = path.join(dir, `${safeDid}_index.json`);
        await fs.writeFile(indexPath, JSON.stringify(indexer, null, 2), 'utf-8');
    }

    private async loadRegistry(): Promise<Record<string, string>> {
        // 1. Try Decentralized Registry first (Device-Agnostic)
        if (this.rootIpnsName) {
            const cid = await StorachaService.resolveIpns(this.rootIpnsName.toString());
            if (cid) {
                const data: any = await StorachaService.fetchMemory(cid);
                if (data && data.index) return data.index;
            }
        }

        // 2. Fallback to Local Index
        const fs = await import('node:fs/promises');
        const path = await import('node:path');
        const dir = path.join(process.cwd(), '.agent_storage');
        const safeDid = this.did.replace(/[^a-zA-Z0-9]/g, '_');
        const indexPath = path.join(dir, `${safeDid}_index.json`);
        try {
            const data = await fs.readFile(indexPath, 'utf-8');
            return JSON.parse(data);
        } catch {
            return {};
        }
    }

    async setNamespaceCid(namespace: string, cid: string): Promise<void> {
        const index = await this.loadRegistry();
        index[namespace] = cid;
        await this.saveRegistry(index);
    }

    async getNamespaceCid(namespace: string): Promise<string | null> {
        const index = await this.loadRegistry();
        return index[namespace] || null;
    }

    /**
     * Lists all session namespaces stored in the decentralized registry.
     */
    async listNamespaces(): Promise<string[]> {
        const index = await this.loadRegistry();
        return Object.keys(index);
    }

    // 1. Semantic Memory
    async readSemanticMemory(): Promise<string> {
        const cid = await this.getNamespaceCid('AGENTDB_MEM_SEMANTIC');
        if (!cid) return "";
        const data = await this.retrievePrivateMemory(cid).catch(() => null);
        return data ? (data as any).markdown || "" : "";
    }

    async updateSemanticMemory(markdown: string): Promise<string> {
        const cid = await this.storePrivateMemory({ markdown });
        await this.setNamespaceCid('AGENTDB_MEM_SEMANTIC', cid);
        return cid;
    }

    // 2. Daily Logs (Episodic)
    async readDailyLog(dateStr: string): Promise<string> {
        const cid = await this.getNamespaceCid(`AGENTDB_MEM_LOGS_${dateStr}`);
        if (!cid) return "";
        const data = await this.retrievePrivateMemory(cid).catch(() => null);
        return data ? (data as any).markdown || "" : "";
    }

    async appendDailyLog(dateStr: string, markdown: string): Promise<string> {
        const existing = await this.readDailyLog(dateStr);
        const newContent = existing ? existing + "\n\n" + markdown : markdown;
        const cid = await this.storePrivateMemory({ markdown: newContent });
        await this.setNamespaceCid(`AGENTDB_MEM_LOGS_${dateStr}`, cid);
        return cid;
    }

    // 3. Session Snapshots
    async saveSessionSnapshot(sessionId: string, markdown: string): Promise<string> {
        const cid = await this.storePrivateMemory({ markdown, sessionId, type: "snapshot" });
        await this.setNamespaceCid(`AGENTDB_MEM_SNAP_${sessionId}`, cid);
        return cid;
    }
}
