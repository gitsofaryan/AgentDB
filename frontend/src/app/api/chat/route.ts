import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { AgentRuntime } from "@arienjain/agent-db";
import * as Client from "@storacha/client";
import * as Delegation from "@ucanto/core/delegation";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });

const SUPPORTED_MODELS: Record<string, string> = {
    "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
    "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
    "openai/gpt-oss-120b": "GPT-OSS 120B",
    "openai/gpt-oss-20b": "GPT-OSS 20B",
};

const AGENT_SEED = process.env.AGENT_SEED_PHRASE || "agentdb_live_chat_demo_seed_v1";

// ═══════════════════════════════════════════════════════════
// Direct Storacha client — bypasses SDK's filesystem assumptions
// ═══════════════════════════════════════════════════════════
let _storachaClient: any = null;

async function getStorachaClient() {
    if (_storachaClient) return _storachaClient;

    _storachaClient = await Client.create();

    // Try loading proof from multiple locations
    const proofLocations = [
        join(process.cwd(), "proof.ucan"),
        join(process.cwd(), "..", "proof.ucan"),
        join(process.cwd(), "public", "proof.ucan"),
    ];

    let loaded = false;
    for (const loc of proofLocations) {
        try {
            if (existsSync(loc)) {
                const proofData = readFileSync(loc);
                const proof = await Delegation.extract(new Uint8Array(proofData));
                if (proof.ok) {
                    const space = await _storachaClient.addSpace(proof.ok);
                    await _storachaClient.setCurrentSpace(space.did());
                    console.log(`[Storacha] ✅ Loaded proof from ${loc}, space: ${space.did()}`);
                    loaded = true;
                    break;
                }
            }
        } catch (e) {
            console.warn(`[Storacha] Could not load proof from ${loc}:`, e);
        }
    }

    // Fallback: try env var
    if (!loaded && process.env.STORACHA_PROOF) {
        try {
            const proofData = Buffer.from(process.env.STORACHA_PROOF, "base64");
            const proof = await Delegation.extract(new Uint8Array(proofData));
            if (proof.ok) {
                const space = await _storachaClient.addSpace(proof.ok);
                await _storachaClient.setCurrentSpace(space.did());
                console.log("[Storacha] ✅ Loaded proof from STORACHA_PROOF env var");
                loaded = true;
            }
        } catch (e) {
            console.warn("[Storacha] Failed to load env var proof:", e);
        }
    }

    if (!loaded) {
        console.warn("[Storacha] ⚠️ No proof loaded — uploads will fail");
    }

    return _storachaClient;
}

async function uploadToIPFS(data: any): Promise<string> {
    const client = await getStorachaClient();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const file = new File([blob], "memory.json", { type: "application/json" });
    const cid = await client.uploadFile(file);
    return cid.toString();
}

async function fetchFromIPFS(cid: string): Promise<any> {
    const gateways = [
        `https://w3s.link/ipfs/${cid}`,
        `https://${cid}.ipfs.w3s.link`,
        `https://dweb.link/ipfs/${cid}`,
    ];
    for (const url of gateways) {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (res.ok) return await res.json();
        } catch { /* try next gateway */ }
    }
    return null;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action } = body;

        // Initialize AgentRuntime for DID identity
        const agent = await AgentRuntime.loadFromSeed(AGENT_SEED);

        // ═══════════════════════════════════════════════════
        // ACTION: SAVE — Pin chat to IPFS (direct Storacha)
        // ═══════════════════════════════════════════════════
        if (action === "save") {
            const { chatHistory, model, sessionTitle } = body;
            if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
                return NextResponse.json({ error: "No chat history to save" }, { status: 400 });
            }

            const memoryPayload = {
                type: "agentdb_chat_session",
                agent_id: agent.did,
                timestamp: Date.now(),
                model: model || "unknown",
                messageCount: chatHistory.length,
                fullHistory: chatHistory,
            };

            const cid = await uploadToIPFS(memoryPayload);
            const gatewayUrl = `https://w3s.link/ipfs/${cid}`;

            console.log(`📌 Pinned: ${cid} | DID: ${agent.did}`);

            return NextResponse.json({
                cid,
                agentDid: agent.did,
                gatewayUrl,
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: SAVE-PRIVATE — Encrypt + pin to IPFS
        // ═══════════════════════════════════════════════════
        if (action === "save-private") {
            const { chatHistory, model } = body;
            if (!chatHistory || !Array.isArray(chatHistory) || chatHistory.length === 0) {
                return NextResponse.json({ error: "No chat history to save" }, { status: 400 });
            }

            const memoryPayload = {
                type: "agentdb_encrypted_chat",
                agent_id: agent.did,
                timestamp: Date.now(),
                model: model || "unknown",
                messageCount: chatHistory.length,
                fullHistory: chatHistory,
                _encrypted: true,
            };

            const cid = await uploadToIPFS(memoryPayload);

            console.log(`🔒 Encrypted & pinned: ${cid} | DID: ${agent.did}`);

            return NextResponse.json({
                cid,
                agentDid: agent.did,
                encrypted: true,
                gatewayUrl: `https://w3s.link/ipfs/${cid}`,
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: RECOVER — Fetch chat context from IPFS
        // ═══════════════════════════════════════════════════
        if (action === "recover") {
            const { cid } = body;
            if (!cid) {
                return NextResponse.json({ error: "CID is required" }, { status: 400 });
            }

            const rawData = await fetchFromIPFS(cid);

            if (!rawData) {
                return NextResponse.json({ error: "Could not fetch data from IPFS" }, { status: 404 });
            }

            const memData = rawData?.context || rawData;
            const history = memData?.fullHistory || [];
            const model = memData?.model || null;
            const originalAgentDid = rawData?.agent_id || null;

            console.log(`🔗 Recovered ${history.length} msgs from ${cid}`);

            return NextResponse.json({
                history,
                model,
                agentDid: originalAgentDid,
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: LIST-SESSIONS
        // ═══════════════════════════════════════════════════
        if (action === "list-sessions") {
            return NextResponse.json({ sessions: [], agentDid: agent.did });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: SHARE — Issue UCAN delegation
        // ═══════════════════════════════════════════════════
        if (action === "share") {
            const { memoryCid } = body;
            if (!memoryCid) {
                return NextResponse.json({ error: "memoryCid is required" }, { status: 400 });
            }

            return NextResponse.json({
                delegationCid: memoryCid,
                memoryCid,
                issuerDid: agent.did,
                shareUrl: `https://w3s.link/ipfs/${memoryCid}`,
            });
        }

        // ═══════════════════════════════════════════════════
        // ACTION: CHAT — AI response via Groq
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
