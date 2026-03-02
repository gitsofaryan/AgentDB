import { describe, it, expect, afterAll } from 'vitest';
import { StorachaService } from '../src/lib/storacha.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const STORAGE_DIR = path.join(process.cwd(), '.agent_storage');

describe('StorachaService (Local Fallback)', () => {
    const testCids: string[] = [];

    afterAll(async () => {
        // Clean up test files
        for (const cid of testCids) {
            try {
                await fs.unlink(path.join(STORAGE_DIR, `${cid}.json`));
            } catch { /* ignore */ }
        }
    });

    it('should upload memory and return a mock CID (local fallback)', async () => {
        const memory = { test: true, data: 'hello', timestamp: Date.now() };
        const cid = await StorachaService.uploadMemory(memory);

        expect(typeof cid).toBe('string');
        expect(cid.length).toBeGreaterThan(10);
        testCids.push(cid);
    });

    it('should fetch locally stored memory by CID', async () => {
        const original = { message: 'persistent-test', value: 123 };
        const cid = await StorachaService.uploadMemory(original);
        testCids.push(cid);

        const fetched = await StorachaService.fetchMemory(cid);
        expect(fetched).toEqual(original);
    });

    it('should return null for a non-existent CID', async () => {
        // This CID uses the mock prefix so it checks local cache first,
        // but the file doesn't exist so it falls through to the network.
        // We increase the timeout to handle the retry logic.
        const fakeCid = 'bafybeis1mnonexistent000000000000';
        const result = await StorachaService.fetchMemory(fakeCid);
        expect(result).toBeNull();
    }, 15000);

    it('should generate correct gateway URL', () => {
        const cid = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
        const url = StorachaService.getGatewayUrl(cid);
        expect(url).toBe(`https://storacha.link/ipfs/${cid}`);
    });

    it('should round-trip complex nested objects', async () => {
        const complex = {
            agent_id: 'did:key:test123',
            context: {
                nested: { deep: { value: [1, 2, 3] } },
                tags: ['a', 'b', 'c'],
            },
            metadata: null,
        };

        const cid = await StorachaService.uploadMemory(complex);
        testCids.push(cid);

        const fetched = await StorachaService.fetchMemory(cid);
        expect(fetched).toEqual(complex);
    });

    it('should produce deterministic CIDs for the same content', async () => {
        const data = { deterministic: true, key: 'fixed-value' };
        
        const cid1 = await StorachaService.uploadMemory(data);
        const cid2 = await StorachaService.uploadMemory(data);
        testCids.push(cid1, cid2);

        expect(cid1).toBe(cid2);
    });

    it('should persist files to .agent_storage directory', async () => {
        const data = { persist: true };
        const cid = await StorachaService.uploadMemory(data);
        testCids.push(cid);

        // Check the file exists on disk
        if (cid.startsWith('bafybeis1m')) {
            const filePath = path.join(STORAGE_DIR, `${cid}.json`);
            const exists = await fs.access(filePath).then(() => true).catch(() => false);
            expect(exists).toBe(true);
        }
    });
});
