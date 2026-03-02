import { describe, it, expect } from 'vitest';
import { AgentRuntime } from '../src/lib/runtime.js';
import { z } from 'zod';
import { ValidationError } from '../src/lib/errors.js';

describe('AgentRuntime', () => {
    describe('Identity', () => {
        it('should create agents with unique DIDs', async () => {
            const a = await AgentRuntime.create();
            const b = await AgentRuntime.create();

            expect(a.did).not.toBe(b.did);
            expect(a.did.startsWith('did:key:')).toBe(true);
            expect(b.did.startsWith('did:key:')).toBe(true);
        });

        it('should deterministically load from the same seed', async () => {
            const seed = 'test-runtime-seed-deterministic';
            const a = await AgentRuntime.loadFromSeed(seed);
            const b = await AgentRuntime.loadFromSeed(seed);

            expect(a.did).toBe(b.did);
        });

        it('should produce different DIDs from different seeds', async () => {
            const a = await AgentRuntime.loadFromSeed('seed-one');
            const b = await AgentRuntime.loadFromSeed('seed-two');

            expect(a.did).not.toBe(b.did);
        });

        it('should load from a base64 key', async () => {
            // Generate a 32-byte seed as base64
            const seed = Buffer.from('a'.repeat(32)).toString('base64');
            const agent = await AgentRuntime.fromKey(seed);

            expect(agent.did.startsWith('did:key:')).toBe(true);
        });

        it('should expose identity via .identity accessor', async () => {
            const agent = await AgentRuntime.create();
            expect(typeof agent.identity.did).toBe('function');
            expect(agent.identity.did()).toBe(agent.did);
        });
    });

    describe('Public Memory', () => {
        it('should store and retrieve public memory', async () => {
            const agent = await AgentRuntime.loadFromSeed('public-memory-test');
            const context = { task: 'test-task', status: 'running', value: 42 };

            const cid = await agent.storePublicMemory(context);
            expect(typeof cid).toBe('string');
            expect(cid.length).toBeGreaterThan(0);

            const retrieved: any = await agent.retrievePublicMemory(cid);
            expect(retrieved).not.toBeNull();
            expect(retrieved.context).toEqual(context);
            expect(retrieved.agent_id).toBe(agent.did);
        });

        it('should track stored CIDs', async () => {
            const agent = await AgentRuntime.loadFromSeed('cid-tracker-test');
            expect(agent.getStoredCids()).toHaveLength(0);

            await agent.storePublicMemory({ a: 1 });
            await agent.storePublicMemory({ b: 2 });

            expect(agent.getStoredCids()).toHaveLength(2);
        });

        it('should return a gateway URL', async () => {
            const agent = await AgentRuntime.create();
            const url = agent.getMemoryUrl('bafytest123');
            expect(url).toContain('storacha.link/ipfs/bafytest123');
        });

        it('should validate with a Zod schema (success)', async () => {
            const agent = await AgentRuntime.loadFromSeed('schema-success-test');
            const schema = z.object({
                task: z.string(),
                priority: z.number().min(1).max(5),
            });

            const cid = await agent.storePublicMemory(
                { task: 'validate', priority: 3 },
                schema
            );
            expect(typeof cid).toBe('string');
        });

        it('should reject invalid data with a Zod schema', async () => {
            const agent = await AgentRuntime.loadFromSeed('schema-fail-test');
            const schema = z.object({
                task: z.string(),
                priority: z.number().min(1).max(5),
            });

            await expect(
                agent.storePublicMemory({ task: 123, priority: 99 }, schema)
            ).rejects.toThrow(ValidationError);
        });
    });

    describe('Private Memory (ECIES)', () => {
        it('should encrypt, store, and decrypt private memory', async () => {
            const agent = await AgentRuntime.loadFromSeed('private-mem-test');
            const secrets = { api_key: 'sk-12345', password: 'hunter2' };

            const cid = await agent.storePrivateMemory(secrets);
            expect(typeof cid).toBe('string');

            const decrypted: any = await agent.retrievePrivateMemory(cid);
            expect(decrypted).toEqual(secrets);
        });

        it('should fail decryption by a different agent', async () => {
            const agentA = await AgentRuntime.loadFromSeed('private-owner');
            const agentB = await AgentRuntime.loadFromSeed('private-attacker');

            const cid = await agentA.storePrivateMemory({ secret: 'only-for-A' });

            // Agent B tries to decrypt — should fail because different keys
            await expect(
                agentB.retrievePrivateMemory(cid)
            ).rejects.toThrow();
        });
    });

    describe('UCAN Delegation', () => {
        it('should issue and verify a delegation via runtime', async () => {
            const master = await AgentRuntime.create();
            const sub = await AgentRuntime.create();

            const delegation = await master.delegateTo(sub.identity, 'agent/read', 1);
            expect(delegation).toBeDefined();
            expect(delegation.capabilities[0].can).toBe('agent/read');

            const result = sub.verifyIncoming(delegation, master.did, 'agent/read');
            expect(result.valid).toBe(true);
        });

        it('should reject verification with wrong issuer DID', async () => {
            const master = await AgentRuntime.create();
            const sub = await AgentRuntime.create();
            const imposter = await AgentRuntime.create();

            const delegation = await master.delegateTo(sub.identity, 'agent/read');

            const result = sub.verifyIncoming(delegation, imposter.did, 'agent/read');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Issuer mismatch');
        });

        it('should reject verification with wrong capability', async () => {
            const master = await AgentRuntime.create();
            const sub = await AgentRuntime.create();

            const delegation = await master.delegateTo(sub.identity, 'agent/read');

            const result = sub.verifyIncoming(delegation, master.did, 'agent/write');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('Missing capability');
        });

        it('should track issued delegations', async () => {
            const master = await AgentRuntime.create();
            const sub = await AgentRuntime.create();

            await master.delegateTo(sub.identity, 'agent/read');
            const issued = master.getIssuedDelegations();

            expect(issued.size).toBe(1);
            expect(issued.has(sub.did)).toBe(true);
        });

        it('should export and import delegations via base64 for API transport', async () => {
            const master = await AgentRuntime.create();
            const sub = await AgentRuntime.create();

            const delegation = await master.delegateTo(sub.identity, 'agent/read');
            const base64 = await master.exportDelegationForApi(delegation);
            expect(typeof base64).toBe('string');
            expect(base64.length).toBeGreaterThan(0);

            const imported = await sub.importDelegationFromApi(base64, master.did, 'agent/read');
            expect(imported).not.toBeNull();
        });
    });

    describe('Memory with Delegation Auth', () => {
        it('should allow retrieval with valid delegation', async () => {
            const owner = await AgentRuntime.loadFromSeed('auth-owner');
            const reader = await AgentRuntime.create();

            const cid = await owner.storePublicMemory({ data: 'protected' });
            const delegation = await owner.delegateTo(reader.identity, 'agent/read');

            const result = await reader.retrievePublicMemory(cid, delegation);
            expect(result).not.toBeNull();
        });
    });
});
