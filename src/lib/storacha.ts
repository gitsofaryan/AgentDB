import { create } from '@storacha/client';
import * as Name from 'w3name';
import { NetworkError } from './errors.js';

export class StorachaService {
    // A temporary in-memory store to simulate network fetches when a user
    // runs the demo without being authenticated to a genuine Storacha space.
    private static simulatedMemories = new Map<string, object>();

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
        try {
            return await StorachaService.withRetry(async () => {
                const client = await create();
                const blob = new Blob([JSON.stringify(memory)], { type: 'application/json' });
                const files = [new File([blob], 'memory.json')];

                const cid = await client.uploadDirectory(files);
                return cid.toString();
            });
        } catch (err: unknown) {
             const error = err as Error;
             if (error.message && error.message.includes('missing current space')) {
                 const crypto = await import('crypto');
                 const hash = crypto.createHash('sha256').update(JSON.stringify(memory)).digest('base64').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 32);
                 const mockCid = `bafybeis1m${hash}`;
                 StorachaService.simulatedMemories.set(mockCid, memory);
                 return mockCid;
             }
             if (error instanceof NetworkError) throw error;
             throw new NetworkError(`Failed to upload to IPFS: ${error.message}`);
        }
    }

    /**
     * Fetches agent memory from IPFS using a CID.
     * @param cid The content identifier of the stored memory.
     * @returns The parsed JSON object, or null if fetch fails.
     */
    static async fetchMemory(cid: string): Promise<object | null> {
        // Intercept simulated mock CIDs for local testing
        if (cid.startsWith('bafybeis1m') && StorachaService.simulatedMemories.has(cid)) {
            return StorachaService.simulatedMemories.get(cid) || null;
        }

        const url = StorachaService.getGatewayUrl(cid) + '/memory.json';

        try {
            return await StorachaService.withRetry(async () => {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new NetworkError(`Gateway returned ${response.status}: ${response.statusText}`);
                }
                return await response.json();
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
        const client = await create();

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
        const client = await create();

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
            const name = Name.parse(nameId);
            const revision = await Name.resolve(name);
            return revision.value.replace('/ipfs/', '');
        } catch(e) {
            console.error(`Failed to resolve IPNS name ${nameId}:`, e);
            return null;
        }
    }
}
