import { create } from '@storacha/client';
import * as Name from 'w3name';
import { NetworkError } from './errors.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

import * as Delegation from '@ucanto/core/delegation';

export class StorachaService {
    // Persistent local cache directory for simulated memories when Storacha space is missing.
    private static STORAGE_DIR = path.join(process.cwd(), '.agent_storage');

    // Cached Storacha client (singleton to avoid re-creating on every call)
    private static _cachedClient: any = null;

    /**
     * Returns a cached Storacha client instance.
     */
    private static async getClient() {
        if (!StorachaService._cachedClient) {
            StorachaService._cachedClient = await create();
            
            // Auto-load delegation proof if it exists in the project root
            const proofPath = path.join(process.cwd(), 'proof.ucan');
            try {
                const proofData = await fs.readFile(proofPath);
                const delegation = await Delegation.extract(proofData);
                await StorachaService._cachedClient.addSpace(delegation);
            } catch (err) {
                // If proof.ucan doesn't exist or is invalid, just proceed. 
                // The client won't be able to upload until a proof is loaded manually or via the API.
            }
        }
        return StorachaService._cachedClient;
    }

    /**
     * Initializes the local storage directory.
     */
    private static async ensureCacheDir() {
        try {
            await fs.mkdir(StorachaService.STORAGE_DIR, { recursive: true });
        } catch (err) {
            // Directory might already exist
        }
    }

    /**
     * Executes an async operation with exponential backoff retries.
     */
    private static async withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
        let attempt = 0;
        while (attempt < maxRetries) {
            try {
                return await operation();
            } catch (err: unknown) {
                const error = err as Error;
                // Do not retry missing space authentication errors
                if (error.message && error.message.includes('missing current space')) {
                    throw error;
                }
                attempt++;
                if (attempt >= maxRetries) {
                    throw new NetworkError(`IPFS operation failed after ${maxRetries} attempts: ${error.message}`);
                }
                console.warn(`⚠️ IPFS Network Operation failed, retrying in ${attempt * 2}s...`);
                await new Promise(res => setTimeout(res, attempt * 2000));
            }
        }
        throw new NetworkError('IPFS Operation failed permanently');
    }

    /**
     * Uploads agent memory to Storacha's decentralized IPFS network.
     * @param memory The JSON object representing the agent's context.
     * @returns The CID of the uploaded content.
     */
    static async uploadMemory(memory: object): Promise<string> {
        await StorachaService.ensureCacheDir();
        try {
            return await StorachaService.withRetry(async () => {
                const client = await StorachaService.getClient();
                const blob = new Blob([JSON.stringify(memory)], { type: 'application/json' });
                const files = [new File([blob], 'memory.json')];

                const cid = await client.uploadDirectory(files);
                return cid.toString();
            });
        } catch (err: unknown) {
             const error = err as Error;
             console.error("DEBUG DUMP IPFS UPLOAD ERROR:", error);
             if (error instanceof NetworkError) throw error;
             throw new NetworkError(`Failed to upload to IPFS. Ensure Storacha CLI is configured: ${error.message}`);
        }
    }

    private static cache = new Map<string, object>();
    private static GATEWAYS = [
        "https://storacha.link/ipfs/",
        "https://cloudflare-ipfs.com/ipfs/",
        "https://w3s.link/ipfs/",
        "https://ipfs.io/ipfs/"
    ];

    /**
     * Fetches agent memory from IPFS using a CID.
     * Hardened: Uses "Gateway Racing" and local caching for high performance.
     * @param cid The content identifier of the stored memory.
     * @returns The parsed JSON object, or null if fetch fails.
     */
    static async fetchMemory(cid: string): Promise<object | null> {
        // 1. Check local cache (Fastest)
        if (this.cache.has(cid)) return this.cache.get(cid)!;

        try {
            return await StorachaService.withRetry(async () => {
                // 2. Gateway Racing: Fire requests to multiple gateways in parallel
                const controllers = this.GATEWAYS.map(() => new AbortController());
                
                const fetchPromises = this.GATEWAYS.map(async (baseUrl, index) => {
                    const url = `${baseUrl}${cid}/memory.json`;
                    const signal = (controllers[index] as AbortController).signal;
                    const response = await fetch(url, { signal });
                    
                    if (!response.ok) throw new Error(`Gateway ${index} failed`);
                    const data = await response.json();
                    
                    // Winner! Abort all other pending requests
                    controllers.forEach((c, i) => { if (i !== index) c.abort(); });
                    return data;
                });

                // Take the fastest successful responder
                const winnerData = await Promise.any(fetchPromises);

                // 3. Cache the result
                if (winnerData) {
                    this.cache.set(cid, winnerData);
                    if (this.cache.size > 1000) {
                        const firstKey = this.cache.keys().next().value;
                        if (firstKey) this.cache.delete(firstKey);
                    }
                }

                return winnerData;
            });
        } catch (err: unknown) {
            console.error(`Failed to fetch memory from CID ${cid}:`, err);
            return null;
        }
    }

    /**
     * Uploads a UCAN delegation token (as CAR bytes) to IPFS.
     * This allows fully decentralized token sharing — Agent A publishes
     * the delegation, Agent B fetches it from IPFS using the CID.
     *
     * @param delegationBytes The serialized delegation (CAR archive as Uint8Array).
     * @returns The CID where the delegation token is stored.
     */
    static async publishDelegation(delegationBytes: Uint8Array): Promise<string> {
        const client = await StorachaService.getClient();

        const blob = new Blob([delegationBytes as any], { type: 'application/vnd.ipld.car' });
        const files = [new File([blob], 'delegation.car')];

        return await StorachaService.withRetry(async () => {
            const cid = await client.uploadDirectory(files);
            return cid.toString();
        });
    }

    /**
     * Fetches a UCAN delegation token from IPFS.
     *
     * @param cid The CID where the delegation CAR was stored.
     * @returns The raw delegation bytes (CAR archive), or null if fetch fails.
     */
    static async fetchDelegation(cid: string): Promise<Uint8Array | null> {
        const url = StorachaService.getGatewayUrl(cid) + '/delegation.car';

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
            }
            const buffer = await response.arrayBuffer();
            return new Uint8Array(buffer);
        } catch (err) {
            console.error(`Failed to fetch delegation from CID ${cid}:`, err);
            return null;
        }
    }

    /**
     * Uploads arbitrary data (bytes) to IPFS with a given filename.
     *
     * @param data The raw bytes to upload.
     * @param filename The filename to use in the directory listing.
     * @param mimeType The MIME type of the data.
     * @returns The CID of the uploaded content.
     */
    static async uploadRaw(data: Uint8Array, filename: string, mimeType: string = 'application/octet-stream'): Promise<string> {
        const client = await StorachaService.getClient();

        const blob = new Blob([data as any], { type: mimeType });
        const files = [new File([blob], filename)];

        return await StorachaService.withRetry(async () => {
            const cid = await client.uploadDirectory(files);
            return cid.toString();
        });
    }

    /**
     * Builds the IPFS gateway URL for a given CID.
     * @param cid The content identifier.
     * @returns The full gateway URL.
     */
    static getGatewayUrl(cid: string): string {
        return `https://storacha.link/ipfs/${cid}`;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HIVE MIND (IPNS MUTABLE POINTERS)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Creates a new IPNS mutable pointer (w3name).
     * @returns A WritableName keypair.
     */
    static async createIpnsName(): Promise<Name.WritableName> {
        return await Name.create();
    }

    /**
     * Derives a stable IPNS mutable pointer from a seed.
     * Use this for agent identities to ensure the index pointer is the same on all devices.
     */
    static async deriveIpnsName(seed: string): Promise<Name.WritableName> {
        // Derive a stable 32-byte key from the seed
        const key = crypto.createHash('sha256').update(seed + "_ipns_v1").digest();
        return await Name.from(key);
    }

    /**
     * Publishes an IPFS CID to a mutable IPNS pointer.
     * @param name The WritableName object to publish to.
     * @param cid The CID of the new context.
     * @param previousRevision The previous revision (if updating an existing stream).
     * @returns The newly published revision.
     */
    static async publishToIpns(name: Name.WritableName, cid: string, previousRevision?: Name.Revision): Promise<Name.Revision> {
        return await StorachaService.withRetry(async () => {
            const value = `/ipfs/${cid}`;
            let revision;
            if (previousRevision) {
                revision = await Name.increment(previousRevision, value);
            } else {
                revision = await Name.v0(name, value);
            }
            await Name.publish(revision, name.key);
            return revision;
        });
    }

    /**
     * Resolves an IPNS pointer (w3name ID) to its current IPFS CID.
     * @param nameId The string ID of the IPNS pointer (e.g., "k51qzi5...").
     * @returns The resolved IPFS CID, or null if unresolvable.
     */
    static async resolveIpns(nameId: string): Promise<string | null> {
        try {
            const revision = await StorachaService.getLatestRevision(nameId);
            return revision ? revision.value.replace('/ipfs/', '') : null;
        } catch(e) {
            console.error(`Failed to resolve IPNS name ${nameId}:`, e);
            return null;
        }
    }

    /**
     * Fetches the latest Revision object for an IPNS name.
     * Use this before updating a stream to prevent race conditions.
     */
    static async getLatestRevision(nameId: string): Promise<Name.Revision | null> {
        try {
            const name = Name.parse(nameId);
            return await Name.resolve(name);
        } catch (e) {
            // Might be a new name with no revisions yet
            return null;
        }
    }
}
