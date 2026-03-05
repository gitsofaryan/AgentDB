import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { AgentRuntime } from "@arienjain/agent-db";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";

// Write proof.ucan at runtime from env var (for Vercel serverless)
// The SDK reads proof.ucan from process.cwd() to authenticate with Storacha
const proofPath = join(process.cwd(), "proof.ucan");
if (!existsSync(proofPath) && process.env.STORACHA_PROOF) {
    try {
        writeFileSync(proofPath, Buffer.from(process.env.STORACHA_PROOF, "base64"));
        console.log("[Runtime] ✅ Wrote proof.ucan from STORACHA_PROOF env var to", proofPath);
    } catch (e) {
        console.warn("[Runtime] ⚠️ Could not write proof.ucan:", e);
    }
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

const SUPPORTED_MODELS: Record<string, string> = {
    "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
    "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
    "openai/gpt-oss-120b": "GPT-OSS 120B",
    "openai/gpt-oss-20b": "GPT-OSS 20B",
};

const AGENT_SEED = process.env.AGENT_SEED_PHRASE || "agentdb_live_chat_demo_seed_v1";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        // Initialize AgentRuntime — deterministic DID from seed
        const agent = await AgentRuntime.loadFromSeed(AGENT_SEED);

        // ═══════════════════════════════════════════════════
        // ACTION: SAVE — Pin chat to IPFS + register in session registry
        // SDK: storePublicMemory() + setNamespaceCid()
        // ═══════════════════════════════════════════════════
        if (action === "save") {
            const { chatHistory, model, sessionTitle } = body;
            if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
                return NextResponse.json({ error: "No chat history to save" }, { status: 400 });
            }

            const memoryPayload = {
                type: "agentdb_chat_session",
                sessionTimestamp: Date.now(),
                model: model || "unknown",
                messageCount: chatHistory.length,
                fullHistory: chatHistory,
            };

            // 1. Store on IPFS via AgentRuntime (wraps with agent_id + timestamp)
            // @ts-ignore
            const cid = await agent.storePublicMemory(memoryPayload);
            const gatewayUrl = agent.getMemoryUrl(cid);

            // 2. Register this session in the decentralized IPNS registry
            const namespace = sessionTitle || `chat_${Date.now()}`;
            try {
                await agent.setNamespaceCid(namespace, cid);
            } catch (e) {
                console.warn("[Registry] Could not update session registry:", e);
            }

            console.log(`📌 Pinned: ${cid} | DID: ${agent.did} | Namespace: ${namespace}`);

            return NextResponse.json({
                cid,
                agentDid: agent.did,
                gatewayUrl,
                namespace,
                storedCids: agent.getStoredCids(),
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: SAVE-PRIVATE — Encrypt + pin to IPFS
        // SDK: storePrivateMemory() (X25519 + AES-256-GCM)
        // ═══════════════════════════════════════════════════
        if (action === "save-private") {
            const { chatHistory, model } = body;
            if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
                return NextResponse.json({ error: "No chat history to save" }, { status: 400 });
            }

            const memoryPayload = {
                type: "agentdb_encrypted_chat",
                sessionTimestamp: Date.now(),
                model: model || "unknown",
                messageCount: chatHistory.length,
                fullHistory: chatHistory,
            };

            // Encrypts with agent's X25519 key, then stores the encrypted payload on IPFS
            const cid = await agent.storePrivateMemory(memoryPayload);

            console.log(`🔒 Encrypted & pinned: ${cid} | Only ${agent.did} can decrypt`);

            return NextResponse.json({
                cid,
                agentDid: agent.did,
                encrypted: true,
                gatewayUrl: agent.getMemoryUrl(cid),
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: RECOVER — Fetch chat context from IPFS
        // SDK: retrievePublicMemory() or retrievePrivateMemory()
        // ═══════════════════════════════════════════════════
        if (action === "recover") {
            const { cid } = body;
            if (!cid) {
                return NextResponse.json({ error: "CID is required" }, { status: 400 });
            }

            // Always fetch public first to see what's there
            let rawData: any = await agent.retrievePublicMemory(cid, undefined);

            if (!rawData) {
                return NextResponse.json({ error: "Could not fetch data from IPFS" }, { status: 404 });
            }

            let history: any[] = [];
            let model: string | null = null;
            let originalAgentDid: string | null = null;
            let wasDecrypted = false;

            // Auto-detect encrypted data and try to decrypt
            if (rawData?._encrypted && rawData?.payload) {
                try {
                    const decrypted: any = await agent.retrievePrivateMemory(cid);
                    history = decrypted?.fullHistory || [];
                    model = decrypted?.model || null;
                    originalAgentDid = agent.did;
                    wasDecrypted = true;
                    console.log(`🔓 Auto-decrypted ${history.length} msgs from ${cid}`);
                } catch (decryptErr: any) {
                    console.warn(`⚠️ Auto-decrypt failed: ${decryptErr.message}`);
                    return NextResponse.json({ 
                        error: "This memory is encrypted. Only the original agent can decrypt it.",
                        encrypted: true 
                    }, { status: 403 });
                }
            } else {
                // Public data — unwrap the storePublicMemory envelope
                const memData = rawData?.context || rawData;
                history = memData?.fullHistory || [];
                model = memData?.model || null;
                originalAgentDid = rawData?.agent_id || null;
            }

            console.log(`🔗 Recovered ${history.length} msgs from ${cid}${wasDecrypted ? ' (decrypted)' : ''}`);

            return NextResponse.json({
                history,
                model,
                agentDid: originalAgentDid,
                encrypted: wasDecrypted,
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: LIST-SESSIONS — Load all sessions from IPNS registry
        // SDK: loadRegistry() + listNamespaces()
        // ═══════════════════════════════════════════════════
        if (action === "list-sessions") {
            try {
                const namespaces = await agent.listNamespaces();
                const registry = await agent.loadRegistry();

                const sessions = namespaces.map(ns => ({
                    namespace: ns,
                    cid: registry[ns] || null,
                }));

                return NextResponse.json({
                    sessions,
                    agentDid: agent.did,
                });
            } catch (e) {
                // Registry might not exist yet — that's fine
                return NextResponse.json({ sessions: [], agentDid: agent.did });
            }
        }

        // ═══════════════════════════════════════════════════
        // ACTION: SHARE — Issue UCAN delegation for memory CID
        // SDK: issueAndPublishDelegation()
        // ═══════════════════════════════════════════════════
        if (action === "share") {
            const { memoryCid } = body;
            if (!memoryCid) {
                return NextResponse.json({ error: "memoryCid is required" }, { status: 400 });
            }

            // Create a sub-agent (recipient) — in production, this would be another agent's DID
            const recipientAgent = await AgentRuntime.create();

            // Issue a UCAN delegation allowing read access and publish to IPFS
            const result: any = await agent.issueAndPublishDelegation(
                recipientAgent.identity,
                'agent/read',
                24 // valid for 24 hours
            );

            const delegationCid = result?.delegationCid || result?.cid || 'unknown';

            console.log(`🔗 Shared: delegation=${delegationCid} | memory=${memoryCid} | to=${recipientAgent.did}`);

            return NextResponse.json({
                delegationCid,
                memoryCid,
                recipientDid: recipientAgent.did,
                issuerDid: agent.did,
                expiresIn: "24h",
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: CHAT (default) — AI response via Groq
        // SDK: agent.did in system prompt
        // ═══════════════════════════════════════════════════
        if (!process.env.GROQ_API_KEY) {
            return NextResponse.json({ error: "GROQ_API_KEY is not set" }, { status: 500 });
        }

        const { message, history, model } = body;
        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const selectedModel = (model && SUPPORTED_MODELS[model]) ? model : "llama-3.1-8b-instant";
        const chatHistory = Array.isArray(history) ? history : [];

        const messages = [
            {
                role: "system",
                content: `You are a helpful AI agent powered by AgentDB — a decentralized memory engine built on IPFS and Storacha. Your agent DID is ${agent.did}. You are running on ${SUPPORTED_MODELS[selectedModel]}. The user can pin this conversation to IPFS (public or encrypted), recover it from any device using a CID, or share access via UCAN delegation.`
            },
            ...chatHistory.map((msg: any) => ({
                role: msg.role === "agent" ? "assistant" : "user",
                content: msg.content
            })),
            { role: "user", content: message }
        ];

        const chatCompletion = await groq.chat.completions.create({
            messages: messages as any,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 1024,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "No response generated.";

        return NextResponse.json({
            response: aiResponse,
            agentDid: agent.did,
        });

    } catch (error: any) {
        console.error("Chat API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
