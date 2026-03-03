"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Phase types for the expanded simulation ─────────────────────────── */
type Phase =
    | "idle"
    | "agentB_session"
    | "agentB_fhe"
    | "data_to_ipfs"
    | "ipfs_confirm"
    | "ucan_issue"
    | "ucan_to_a"
    | "agentA_verify"
    | "fetch_from_ipfs"
    | "agentA_decrypt"
    | "discovery_sync"
    | "complete";

interface TimelineEntry {
    phase: Phase;
    label: string;
    actor: string;
    detail: string;
    code?: string;
}

const TIMELINE: TimelineEntry[] = [
    { phase: "agentB_session", label: "Initial Session", actor: "B", detail: "Creating 'CHAT_ALICE' namespace on-chain...", code: "await agent.createSession('CHAT_ALICE');" },
    { phase: "agentB_fhe", label: "FHE Encryption", actor: "B→Zama", detail: "Wrapping sensitive keys in Zama fhEVM vault...", code: "await zama.encryptSecret(agentKey);" },
    { phase: "data_to_ipfs", label: "IPFS Storage", actor: "B→IPFS", detail: "Pinning 20MB session history to Storacha...", code: "const cid = await storacha.upload(sessionData);" },
    { phase: "ipfs_confirm", label: "CID Confirmed", actor: "IPFS", detail: "bafybeigh... — Data is now immutable and global.", code: "// Decentralized storage verified" },
    { phase: "ucan_issue", label: "UCAN Auth", actor: "B", detail: "Issuing session/read to Agent A's identity...", code: "const ucan = await agentB.delegate(agentA, cid);" },
    { phase: "ucan_to_a", label: "Handoff Signal", actor: "B→A", detail: "Transmitting UCAN + CID to Agent A...", code: "// Zero-trust handoff initiated" },
    { phase: "agentA_verify", label: "Validation", actor: "A", detail: "Agent A verifies UCAN signature chain...", code: "await ucan.verify(token, agentB.did);" },
    { phase: "fetch_from_ipfs", label: "Gateway Race", actor: "A→IPFS", detail: "Parallel retrieval from 4 global gateways...", code: "const data = await agentA.fetch(cid);" },
    { phase: "agentA_decrypt", label: "Vault Access", actor: "A→Zama", detail: "Decrypting shared keys via fhEVM...", code: "const secret = await zama.decrypt(vaultHash);" },
    { phase: "discovery_sync", label: "Global Discovery", actor: "A→Registry", detail: "Updating public registry: Agent A is now owner.", code: "await registry.update('CHAT_ALICE', agentA.did);" },
    { phase: "complete", label: "Success", actor: "✅", detail: "Handoff complete. Agent A has full context.", code: "// AgentDB: The future of agent memory." },
];

/* ─── SVG Illustration: Comprehensive Scene ──────────────────────────── */
function SimulationScene({ currentPhase }: { currentPhase: Phase }) {
    const isAgentBActive = ["agentB_session", "agentB_fhe", "data_to_ipfs", "ucan_issue"].includes(currentPhase);
    const isZamaActive = ["agentB_fhe", "agentA_decrypt"].includes(currentPhase);
    const isIpfsActive = ["data_to_ipfs", "ipfs_confirm", "fetch_from_ipfs"].includes(currentPhase);
    const isUcanActive = ["ucan_issue", "ucan_to_a", "agentA_verify"].includes(currentPhase);
    const isAgentAActive = ["agentA_verify", "fetch_from_ipfs", "agentA_decrypt", "discovery_sync", "complete"].includes(currentPhase);
    const isComplete = currentPhase === "complete";

    // Packet show logic
    const showBtoZama = currentPhase === "agentB_fhe";
    const showBtoIPFS = currentPhase === "data_to_ipfs";
    const showBtoUCAN = currentPhase === "ucan_issue";
    const showUCANtoA = currentPhase === "ucan_to_a";
    const showIPFStoA = currentPhase === "fetch_from_ipfs";
    const showZamatoA = currentPhase === "agentA_decrypt";

    return (
        <svg viewBox="0 0 640 400" fill="none" xmlns="http://www.w3.org/2000/svg" className="sim-svg-scene">
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>

            {/* Connection Paths */}
            <path d="M140 160 Q200 60 320 80" stroke="#222" strokeWidth="1" strokeDasharray="4 4" /> {/* B to IPFS */}
            <path d="M140 200 Q200 240 280 220" stroke="#222" strokeWidth="1" strokeDasharray="4 4" /> {/* B to Zama */}
            <path d="M140 240 Q240 340 320 320" stroke="#222" strokeWidth="1" strokeDasharray="4 4" /> {/* B to UCAN */}

            <path d="M360 320 Q440 340 500 240" stroke="#222" strokeWidth="1" strokeDasharray="4 4" /> {/* UCAN to A */}
            <path d="M360 220 Q440 240 500 200" stroke="#222" strokeWidth="1" strokeDasharray="4 4" /> {/* Zama to A */}
            <path d="M320 120 Q440 60 500 160" stroke="#222" strokeWidth="1" strokeDasharray="4 4" /> {/* IPFS to A */}

            {/* Active Path Glows */}
            {isIpfsActive && <path d="M140 160 Q200 60 320 80" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" className="sim-line-glow" opacity="0.4" />}
            {isZamaActive && <path d="M140 200 Q200 240 280 220" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" className="sim-line-glow" opacity="0.4" />}
            {isUcanActive && <path d="M140 240 Q240 340 320 320" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" className="sim-line-glow" opacity="0.4" />}

            {/* Packets */}
            {showBtoZama && <circle r="4" fill="#f59e0b" filter="url(#glow)"><animateMotion dur="1s" repeatCount="indefinite" path="M140 200 Q200 240 280 220" /></circle>}
            {showBtoIPFS && <circle r="4" fill="#10b981" filter="url(#glow)"><animateMotion dur="1s" repeatCount="indefinite" path="M140 160 Q200 60 320 80" /></circle>}
            {showBtoUCAN && <circle r="4" fill="#6366f1" filter="url(#glow)"><animateMotion dur="1s" repeatCount="indefinite" path="M140 240 Q240 340 320 320" /></circle>}
            {showUCANtoA && <circle r="4" fill="#6366f1" filter="url(#glow)"><animateMotion dur="1s" repeatCount="indefinite" path="M360 320 Q440 340 500 240" /></circle>}
            {showIPFStoA && <circle r="4" fill="#10b981" filter="url(#glow)"><animateMotion dur="1s" repeatCount="indefinite" path="M320 120 Q440 60 500 160" /></circle>}
            {showZamatoA && <circle r="4" fill="#f59e0b" filter="url(#glow)"><animateMotion dur="1s" repeatCount="indefinite" path="M360 220 Q440 240 500 200" /></circle>}

            {/* Agent B */}
            <g transform="translate(60, 150)">
                <rect width="80" height="100" rx="12" fill="#12121e" stroke={isAgentBActive ? "#6366f1" : "#222"} strokeWidth="2" className={isAgentBActive ? "sim-node-svg-glow" : ""} />
                <rect x="15" y="15" width="50" height="35" rx="6" fill="#0c0c14" />
                <circle cx="30" cy="32" r="3" fill="#6366f1" opacity={isAgentBActive ? 1 : 0.3} />
                <circle cx="50" cy="32" r="3" fill="#6366f1" opacity={isAgentBActive ? 1 : 0.3} />
                <text x="40" y="75" fontSize="10" fill="#888" textAnchor="middle" fontFamily="monospace">Agent B</text>
                <text x="40" y="88" fontSize="8" fill="#6366f1" textAnchor="middle" fontFamily="monospace" opacity="0.6">Original</text>
            </g>

            {/* Storacha / IPFS */}
            <g transform="translate(320, 80)">
                <circle r="45" fill="#080c14" stroke={isIpfsActive ? "#10b981" : "#222"} strokeWidth="2" className={isIpfsActive ? "sim-node-svg-glow-green" : ""} />
                <path d="M-30 0 Q0 -40 30 0 Q0 40 -30 0" stroke="#10b981" strokeWidth="0.5" opacity="0.2" fill="none" />
                <text y="5" fontSize="9" fill="#10b981" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Storacha</text>
                <text y="18" fontSize="7" fill="#10b981" textAnchor="middle" fontFamily="monospace" opacity="0.5">IPFS Memory</text>
            </g>

            {/* Zama Vault */}
            <g transform="translate(280, 190)">
                <rect width="80" height="55" rx="10" fill="#140f08" stroke={isZamaActive ? "#f59e0b" : "#222"} strokeWidth="2" className={isZamaActive ? "sim-node-svg-glow-amber" : ""} />
                <text x="40" y="25" fontSize="9" fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight="bold">Zama Vault</text>
                <text x="40" y="38" fontSize="7" fill="#f59e0b" textAnchor="middle" fontFamily="monospace" opacity="0.5">FHE Secure</text>
                {/* lock icon */}
                <path d="M35 12 L35 8 Q40 4 45 8 L45 12" stroke="#f59e0b" strokeWidth="1.5" fill="none" opacity="0.6" />
            </g>

            {/* UCAN Token */}
            <g transform="translate(280, 290)">
                <rect width="80" height="55" rx="8" fill="#0d0d1a" stroke={isUcanActive ? "#6366f1" : "#222"} strokeWidth="1.5" className={isUcanActive ? "sim-node-svg-glow-purple" : ""} />
                <text x="40" y="25" fontSize="9" fill="#6366f1" textAnchor="middle" fontFamily="monospace" fontWeight="bold">UCAN Auth</text>
                <text x="40" y="40" fontSize="7" fill="#888" textAnchor="middle" fontFamily="monospace">Delegation</text>
            </g>

            {/* Agent A */}
            <g transform="translate(500, 150)">
                <rect width="80" height="100" rx="12" fill="#12121e" stroke={isAgentAActive ? (isComplete ? "#10b981" : "#6366f1") : "#222"} strokeWidth="2" className={isAgentAActive ? "sim-node-svg-glow" : ""} />
                <rect x="15" y="15" width="50" height="35" rx="6" fill="#0c0c14" />
                <circle cx="30" cy="32" r="3" fill={isComplete ? "#10b981" : "#6366f1"} opacity={isAgentAActive ? 1 : 0.3} />
                <circle cx="50" cy="32" r="3" fill={isComplete ? "#10b981" : "#6366f1"} opacity={isAgentAActive ? 1 : 0.3} />
                <text x="40" y="75" fontSize="10" fill="#888" textAnchor="middle" fontFamily="monospace">Agent A</text>
                <text x="40" y="88" fontSize="8" fill="#6366f1" textAnchor="middle" fontFamily="monospace" opacity="0.6">Recipient</text>
            </g>

            {/* Success Notification */}
            {isComplete && (
                <g transform="translate(240, 20)">
                    <rect width="160" height="30" rx="15" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="1" />
                    <text x="80" y="20" fontSize="10" fill="#10b981" textAnchor="middle" fontFamily="monospace" fontWeight="bold">✅ CONTEXT SYNCED</text>
                </g>
            )}
        </svg>
    );
}

/* ─── Main Component: Side-by-Side Layout ───────────────────────────── */
export default function HandoffSimulator() {
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(-1);
    const [isRunning, setIsRunning] = useState(false);

    const currentPhase = currentPhaseIndex >= 0 ? TIMELINE[currentPhaseIndex]?.phase || "idle" : "idle";

    const runSimulation = useCallback(() => {
        setIsRunning(true);
        setCurrentPhaseIndex(0);
    }, []);

    const reset = () => {
        setIsRunning(false);
        setCurrentPhaseIndex(-1);
    };

    useEffect(() => {
        if (!isRunning || currentPhaseIndex < 0) return;
        if (currentPhaseIndex >= TIMELINE.length) {
            setIsRunning(false);
            return;
        }

        const timer = setTimeout(() => {
            if (currentPhaseIndex < TIMELINE.length - 1) {
                setCurrentPhaseIndex((i) => i + 1);
            } else {
                setIsRunning(false);
            }
        }, 1800);

        return () => clearTimeout(timer);
    }, [isRunning, currentPhaseIndex]);

    return (
        <section className="sim-section-side">
            <div className="sim-header">
                <div>
                    <span className="lp-section-eyebrow">Interactive Workflow</span>
                    <h2 className="sim-title">How AgentDB Works</h2>
                    <p className="sim-subtitle">Decentralized Handoff Protocol (11 Phases)</p>
                </div>
                <button className="sim-btn" onClick={isRunning ? reset : runSimulation}>
                    {isRunning ? "Stop" : currentPhaseIndex >= TIMELINE.length - 1 ? "Replay" : "▶ Start Simulation"}
                </button>
            </div>

            <div className="sim-side-layout">
                {/* Left: Simulation SVG */}
                <div className="sim-canvas-side">
                    <div className="sim-grid-overlay" />
                    <SimulationScene currentPhase={currentPhase} />
                </div>

                {/* Right: Timeline & Terminal */}
                <div className="sim-info-side">
                    <div className="sim-timeline-vertical-premium">
                        {TIMELINE.map((entry, i) => (
                            <div
                                key={entry.phase}
                                className={`sim-vtl-item-premium ${i < currentPhaseIndex ? "done" : i === currentPhaseIndex ? "active" : ""}`}
                                style={{ opacity: i > currentPhaseIndex + 1 ? 0.3 : 1 }}
                            >
                                <div className="dot" />
                                <div className="content">
                                    <div className="label">{entry.label}</div>
                                    {i === currentPhaseIndex && <div className="detail">{entry.detail}</div>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="sim-terminal-premium">
                        <div className="sim-term-header">
                            <span className="dot red" />
                            <span className="dot yellow" />
                            <span className="dot green" />
                            <span className="title">agent-db-kernel.log</span>
                        </div>
                        <div className="sim-term-body">
                            {TIMELINE.slice(0, Math.max(0, currentPhaseIndex + 1)).map((entry, i) => (
                                <div key={i} className="line">
                                    <span className="prompt">❯</span>
                                    <span className="code">{entry.code}</span>
                                </div>
                            ))}
                            {currentPhaseIndex < 0 && <div className="line muted">Waiting for signal...</div>}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
