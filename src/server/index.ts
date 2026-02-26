import express from 'express';
import cors from 'cors';
import { UcanService } from '../lib/ucan.js';
import { StorachaService } from '../lib/storacha.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY STORES (in production, use Redis/DB)
// ═══════════════════════════════════════════════════════════════════

// Stores delegations: delegationId → { base64Token, issuerDid, audienceDid, ability, memoryCids, createdAt }
const delegationStore: Map<string, {
    base64Token: string;
    issuerDid: string;
    audienceDid: string;
    ability: string;
    memoryCids: string[];
    createdAt: string;
}> = new Map();

// Stores memory metadata: cid → { ownerDid, createdAt }
const memoryIndex: Map<string, {
    ownerDid: string;
    createdAt: string;
}> = new Map();

// Track agent identities created via the API (for demo purposes)
const agentStore: Map<string, any> = new Map();

let delegationCounter = 0;

// ═══════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Agent Context Service',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        stores: {
            delegations: delegationStore.size,
            memories: memoryIndex.size,
            agents: agentStore.size,
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// IDENTITY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/identity
 * Create a new agent identity.
 * Returns: { did, message }
 */
app.post('/api/identity', async (_req, res) => {
    try {
        const signer = await UcanService.createIdentity();
        const did = signer.did();

        // Store the signer so we can use it for delegation later
        agentStore.set(did, signer);

        res.json({
            did,
            message: 'Agent identity created. Use this DID for delegations.',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/identity/:did
 * Check if an agent identity exists.
 */
app.get('/api/identity/:did', (req, res) => {
    const exists = agentStore.has(req.params.did);
    res.json({ did: req.params.did, exists });
});

// ═══════════════════════════════════════════════════════════════════
// MEMORY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/memory
 * Store agent context. Uploads to Storacha IPFS.
 * Body: { did: string, context: object }
 * Returns: { cid, gatewayUrl }
 *
 * If Storacha account isn't configured, simulates the upload.
 */
app.post('/api/memory', async (req, res) => {
    const { did, context } = req.body;

    if (!did || !context) {
        return res.status(400).json({ error: 'Missing required fields: did, context' });
    }

    try {
        const payload = {
            agent_id: did,
            timestamp: new Date().toISOString(),
            context,
        };

        let cid: string;
        let simulated = false;

        try {
            cid = await StorachaService.uploadMemory(payload);
        } catch {
            // Fallback: generate a deterministic simulated CID
            const hash = Buffer.from(JSON.stringify(payload)).toString('base64').slice(0, 32);
            cid = `bafybeisim_${hash}`;
            simulated = true;
        }

        memoryIndex.set(cid, {
            ownerDid: did,
            createdAt: new Date().toISOString(),
        });

        res.json({
            cid,
            gatewayUrl: StorachaService.getGatewayUrl(cid),
            simulated,
            message: simulated
                ? 'Memory stored (simulated — configure Storacha account for live IPFS)'
                : 'Memory stored on IPFS via Storacha',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/memory/:cid
 * Retrieve agent memory from IPFS.
 * Requires: Authorization header with Bearer <base64-ucan-token>
 *
 * The token is verified before serving the memory:
 * 1. Decodes the base64 UCAN token
 * 2. Identifies the memory owner from the index
 * 3. Verifies the delegation was issued by the owner
 * 4. Checks the 'agent/read' capability exists and hasn't expired
 * 5. Fetches and returns the memory from IPFS
 */
app.get('/api/memory/:cid', async (req, res) => {
    const { cid } = req.params;
    const authHeader = req.headers.authorization;

    // Check if memory exists in our index
    const memoryMeta = memoryIndex.get(cid);
    if (!memoryMeta) {
        return res.status(404).json({ error: 'Memory not found in index. It may exist on IPFS but is not registered with this service.' });
    }

    // If no auth header, check if requester is the owner
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authorization required',
            hint: 'Provide a UCAN delegation token as: Authorization: Bearer <base64-ucan-token>',
            ownerDid: memoryMeta.ownerDid,
        });
    }

    const base64Token = authHeader.replace('Bearer ', '');

    try {
        // Decode and verify the UCAN delegation
        const delegation = await UcanService.delegationFromBase64(base64Token);

        const verification = UcanService.verifyDelegation(
            delegation,
            memoryMeta.ownerDid,
            'agent/read'
        );

        if (!verification.valid) {
            return res.status(403).json({
                error: 'Authorization denied',
                reason: verification.reason,
            });
        }

        // Authorization passed — fetch from IPFS
        const memory = await StorachaService.fetchMemory(cid);

        if (memory) {
            res.json({
                memory,
                verification: 'passed',
                issuer: delegation.issuer.did(),
                audience: delegation.audience.did(),
            });
        } else {
            // If IPFS fetch fails (e.g., simulated CID), return the metadata
            res.json({
                memory: null,
                verification: 'passed',
                note: 'UCAN verification passed but IPFS fetch failed (CID may be simulated)',
                issuer: delegation.issuer.did(),
                audience: delegation.audience.did(),
                meta: memoryMeta,
            });
        }
    } catch (err: any) {
        res.status(400).json({ error: `Invalid UCAN token: ${err.message}` });
    }
});

// ═══════════════════════════════════════════════════════════════════
// DELEGATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/delegate
 * Agent A creates a delegation for Agent B.
 * Body: { issuerDid: string, audienceDid: string, ability?: string, memoryCids?: string[], expirationHours?: number }
 * Returns: { delegationId, base64Token, delegation details }
 *
 * The issuerDid must have been created via POST /api/identity first.
 */
app.post('/api/delegate', async (req, res) => {
    const {
        issuerDid,
        audienceDid,
        ability = 'agent/read',
        memoryCids = [],
        expirationHours = 24,
    } = req.body;

    if (!issuerDid || !audienceDid) {
        return res.status(400).json({ error: 'Missing required fields: issuerDid, audienceDid' });
    }

    // Get the issuer's signer
    const issuerSigner = agentStore.get(issuerDid);
    if (!issuerSigner) {
        return res.status(404).json({
            error: `Issuer ${issuerDid} not found. Create it first via POST /api/identity.`
        });
    }

    // Get or create audience identity
    let audienceSigner = agentStore.get(audienceDid);
    if (!audienceSigner) {
        // If audience doesn't exist in our store, create a temporary signer for them
        audienceSigner = await UcanService.createIdentity();
        agentStore.set(audienceSigner.did(), audienceSigner);

        // Note: the audienceDid provided won't match the generated one
        // In a real system, Agent B would provide their real DID
    }

    try {
        const delegation = await UcanService.issueDelegation(
            issuerSigner,
            audienceSigner,
            ability,
            expirationHours
        );

        const base64Token = await UcanService.delegationToBase64(delegation);

        const delegationId = `dlg_${++delegationCounter}_${Date.now()}`;

        delegationStore.set(delegationId, {
            base64Token,
            issuerDid: issuerSigner.did(),
            audienceDid: audienceSigner.did(),
            ability,
            memoryCids,
            createdAt: new Date().toISOString(),
        });

        res.json({
            delegationId,
            base64Token,
            issuerDid: issuerSigner.did(),
            audienceDid: audienceSigner.did(),
            ability,
            memoryCids,
            expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000).toISOString(),
            message: 'Delegation created. Share the base64Token with Agent B, or they can fetch it via GET /api/delegation/:id',
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/delegation/:id
 * Agent B fetches their delegation token.
 * Returns: { base64Token, issuerDid, audienceDid, ability, memoryCids }
 */
app.get('/api/delegation/:id', (req, res) => {
    const entry = delegationStore.get(req.params.id);

    if (!entry) {
        return res.status(404).json({ error: 'Delegation not found' });
    }

    res.json({
        delegationId: req.params.id,
        base64Token: entry.base64Token,
        issuerDid: entry.issuerDid,
        audienceDid: entry.audienceDid,
        ability: entry.ability,
        memoryCids: entry.memoryCids,
        createdAt: entry.createdAt,
        hint: 'Use the base64Token as: Authorization: Bearer <base64Token> when calling GET /api/memory/:cid',
    });
});

/**
 * GET /api/delegations
 * List all delegations (for debugging/demo).
 */
app.get('/api/delegations', (_req, res) => {
    const list = Array.from(delegationStore.entries()).map(([id, entry]) => ({
        delegationId: id,
        issuerDid: entry.issuerDid,
        audienceDid: entry.audienceDid,
        ability: entry.ability,
        memoryCids: entry.memoryCids,
        createdAt: entry.createdAt,
    }));

    res.json({ delegations: list, count: list.length });
});

// ═══════════════════════════════════════════════════════════════════
// FULL FLOW ENDPOINT (Demo)
// ═══════════════════════════════════════════════════════════════════

/**
 * POST /api/demo/full-flow
 * Demonstrates the complete agent-to-agent communication flow:
 * 1. Creates Agent A and Agent B identities
 * 2. Agent A stores a memory
 * 3. Agent A issues a UCAN delegation to Agent B
 * 4. Agent B verifies the delegation
 * 5. Agent B retrieves the memory using the delegation
 *
 * Body: { context?: object } (optional context to store)
 */
app.post('/api/demo/full-flow', async (_req, res) => {
    try {
        const context = _req.body.context || { status: 'exploring', goal: 'find-water', inventory: ['map', 'compass'] };

        // Step 1: Create identities
        const agentA = await UcanService.createIdentity();
        const agentB = await UcanService.createIdentity();

        // Step 2: Store memory (simulated since no Storacha account)
        const memoryPayload = {
            agent_id: agentA.did(),
            timestamp: new Date().toISOString(),
            context,
        };

        let cid: string;
        try {
            cid = await StorachaService.uploadMemory(memoryPayload);
        } catch {
            cid = `bafybeisim_demo_${Date.now()}`;
        }

        memoryIndex.set(cid, {
            ownerDid: agentA.did(),
            createdAt: new Date().toISOString(),
        });

        // Step 3: Agent A issues delegation to Agent B
        const delegation = await UcanService.issueDelegation(agentA, agentB, 'agent/read');
        const base64Token = await UcanService.delegationToBase64(delegation);

        // Step 4: Verify the delegation
        const verification = UcanService.verifyDelegation(delegation, agentA.did(), 'agent/read');

        // Step 5: Also serialize/deserialize to prove the round-trip works
        const roundTripped = await UcanService.delegationFromBase64(base64Token);
        const roundTripVerify = UcanService.verifyDelegation(roundTripped, agentA.did(), 'agent/read');

        res.json({
            flow: 'complete',
            step1_identities: {
                agentA: agentA.did(),
                agentB: agentB.did(),
            },
            step2_memory: {
                cid,
                gatewayUrl: StorachaService.getGatewayUrl(cid),
                payload: memoryPayload,
            },
            step3_delegation: {
                cid: delegation.cid.toString(),
                base64Token: base64Token.slice(0, 50) + '...',
                base64TokenLength: base64Token.length,
                issuer: delegation.issuer.did(),
                audience: delegation.audience.did(),
                capability: 'agent/read',
                expiration: new Date(delegation.expiration * 1000).toISOString(),
            },
            step4_verification: verification,
            step5_roundTrip: {
                serializeDeserialize: 'success',
                verification: roundTripVerify,
            },
            howToUse: {
                agentB_retrieval: `curl -H "Authorization: Bearer <full_base64_token>" http://localhost:3001/api/memory/${cid}`,
            },
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// ═══════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           🧠 Agent Context Service — API Gateway             ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Server running on http://localhost:${PORT}                    ║
║                                                              ║
║  Endpoints:                                                  ║
║  ──────────────────────────────────────────────────────────   ║
║  GET  /api/health              Service health check          ║
║  POST /api/identity            Create agent identity         ║
║  POST /api/memory              Store agent context           ║
║  GET  /api/memory/:cid         Retrieve memory (UCAN auth)  ║
║  POST /api/delegate            Issue UCAN delegation         ║
║  GET  /api/delegation/:id      Fetch delegation token        ║
║  GET  /api/delegations         List all delegations          ║
║  POST /api/demo/full-flow      Run complete demo flow        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
});

export default app;
