import { create } from '@storacha/client';

export class StorachaService {
    /**
     * Uploads agent memory to Storacha's decentralized IPFS network.
     * @param memory The JSON object representing the agent's context.
     * @returns The CID of the uploaded content.
     */
    static async uploadMemory(memory: object): Promise<string> {
        const client = await create();

        const blob = new Blob([JSON.stringify(memory)], { type: 'application/json' });
        const files = [new File([blob], 'memory.json')];

        console.log("Uploading memory to Storacha...");
        const cid = await client.uploadDirectory(files);

        return cid.toString();
    }

    /**
     * Fetches agent memory from IPFS using a CID.
     * @param cid The content identifier of the stored memory.
     * @returns The parsed JSON object, or null if fetch fails.
     */
    static async fetchMemory(cid: string): Promise<object | null> {
        const url = StorachaService.getGatewayUrl(cid) + '/memory.json';

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
            }
            const data = await response.json();
            return data;
        } catch (err) {
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

        const blob = new Blob([delegationBytes], { type: 'application/vnd.ipld.car' });
        const files = [new File([blob], 'delegation.car')];

        console.log("Publishing UCAN delegation to IPFS...");
        const cid = await client.uploadDirectory(files);

        return cid.toString();
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

        const blob = new Blob([data], { type: mimeType });
        const files = [new File([blob], filename)];

        const cid = await client.uploadDirectory(files);
        return cid.toString();
    }

    /**
     * Builds the IPFS gateway URL for a given CID.
     * @param cid The content identifier.
     * @returns The full gateway URL.
     */
    static getGatewayUrl(cid: string): string {
        return `https://storacha.link/ipfs/${cid}`;
    }
}
