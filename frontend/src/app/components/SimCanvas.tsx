"use client";

import React from "react";
import type { SimScenario, SimStep } from "./SimSidebar";

/* ─── Canvas Props ───────────────────────────────────────────────────── */
interface SimCanvasProps {
    scenario: SimScenario | null;
    currentStepIndex: number;
    totalSteps: number;
    isRunning: boolean;
    onNodeClick: (nodeId: string) => void;
    onStepChange: (index: number) => void;
}

/* ─── Custom SVG shape per node type ─────────────────────────────────── */
function NodeShape({ type, c }: { type: string; c: { stroke: string; fill: string } }) {
    switch (type) {
        /* AGENT — Hexagon with brain circuit */
        case "agent":
            return (
                <g>
                    <polygon points="0,-38 33,-19 33,19 0,38 -33,19 -33,-19" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Brain circuit lines */}
                    <circle cx="0" cy="-8" r="8" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.6" />
                    <line x1="-6" y1="-2" x2="-12" y2="8" stroke={c.stroke} strokeWidth="0.8" opacity="0.5" />
                    <line x1="6" y1="-2" x2="12" y2="8" stroke={c.stroke} strokeWidth="0.8" opacity="0.5" />
                    <circle cx="-12" cy="8" r="2.5" fill={c.stroke} opacity="0.6" />
                    <circle cx="12" cy="8" r="2.5" fill={c.stroke} opacity="0.6" />
                    <circle cx="0" cy="14" r="2.5" fill={c.stroke} opacity="0.6" />
                    <line x1="-12" y1="8" x2="0" y2="14" stroke={c.stroke} strokeWidth="0.8" opacity="0.4" />
                    <line x1="12" y1="8" x2="0" y2="14" stroke={c.stroke} strokeWidth="0.8" opacity="0.4" />
                </g>
            );
        /* IPFS — Globe with meridians */
        case "ipfs":
            return (
                <g>
                    <circle r="34" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    <ellipse cx="0" cy="0" rx="34" ry="14" fill="none" stroke={c.stroke} strokeWidth="0.7" opacity="0.35" />
                    <ellipse cx="0" cy="0" rx="14" ry="34" fill="none" stroke={c.stroke} strokeWidth="0.7" opacity="0.35" />
                    <line x1="-34" y1="0" x2="34" y2="0" stroke={c.stroke} strokeWidth="0.6" opacity="0.25" />
                    <line x1="0" y1="-34" x2="0" y2="34" stroke={c.stroke} strokeWidth="0.6" opacity="0.25" />
                    {/* Node dots */}
                    <circle cx="0" cy="-14" r="2" fill={c.stroke} opacity="0.7" />
                    <circle cx="14" cy="0" r="2" fill={c.stroke} opacity="0.7" />
                    <circle cx="-14" cy="0" r="2" fill={c.stroke} opacity="0.7" />
                    <circle cx="0" cy="14" r="2" fill={c.stroke} opacity="0.7" />
                </g>
            );
        /* UCAN — Key/Shield shape */
        case "ucan":
            return (
                <g>
                    <rect x="-30" y="-34" width="60" height="68" rx="16" ry="16" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Key icon */}
                    <circle cx="0" cy="-8" r="10" fill="none" stroke={c.stroke} strokeWidth="1.5" opacity="0.7" />
                    <circle cx="0" cy="-8" r="3" fill={c.stroke} opacity="0.5" />
                    <line x1="0" y1="2" x2="0" y2="18" stroke={c.stroke} strokeWidth="1.5" opacity="0.7" />
                    <line x1="0" y1="12" x2="6" y2="12" stroke={c.stroke} strokeWidth="1.5" opacity="0.7" />
                    <line x1="0" y1="18" x2="6" y2="18" stroke={c.stroke} strokeWidth="1.5" opacity="0.7" />
                </g>
            );
        /* ZAMA — Diamond-shaped vault */
        case "zama":
            return (
                <g>
                    <polygon points="0,-36 36,0 0,36 -36,0" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Lock icon */}
                    <rect x="-8" y="-2" width="16" height="14" rx="2" fill="none" stroke={c.stroke} strokeWidth="1.2" opacity="0.7" />
                    <path d="M-5,-2 L-5,-7 A5,5 0 0,1 5,-7 L5,-2" fill="none" stroke={c.stroke} strokeWidth="1.2" opacity="0.7" />
                    <circle cx="0" cy="6" r="2" fill={c.stroke} opacity="0.8" />
                </g>
            );
        /* IPNS — Antenna/signal shape */
        case "ipns":
            return (
                <g>
                    <circle r="34" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Signal waves */}
                    <path d="M-10,-8 A14,14 0 0,1 10,-8" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.5" />
                    <path d="M-16,-14 A22,22 0 0,1 16,-14" fill="none" stroke={c.stroke} strokeWidth="0.8" opacity="0.35" />
                    <path d="M-22,-20 A30,30 0 0,1 22,-20" fill="none" stroke={c.stroke} strokeWidth="0.6" opacity="0.25" />
                    {/* Antenna base */}
                    <line x1="0" y1="-4" x2="0" y2="14" stroke={c.stroke} strokeWidth="1.5" opacity="0.7" />
                    <circle cx="0" cy="-4" r="3" fill={c.stroke} opacity="0.8" />
                    <line x1="-8" y1="14" x2="8" y2="14" stroke={c.stroke} strokeWidth="1.2" opacity="0.5" />
                </g>
            );
        /* GATEWAY — Lightning bolt / speed shape */
        case "gateway":
            return (
                <g>
                    <polygon points="0,-36 28,-20 28,20 0,36 -28,20 -28,-20" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Lightning bolt */}
                    <path d="M2,-16 L-6,-2 L2,-2 L-2,16 L10,0 L2,0 Z" fill={c.stroke} opacity="0.7" />
                </g>
            );
        /* REGISTRY — Database/cylinder shape drawn as stacked layers */
        case "registry":
            return (
                <g>
                    <rect x="-28" y="-30" width="56" height="60" rx="8" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Stacked layers */}
                    <line x1="-20" y1="-12" x2="20" y2="-12" stroke={c.stroke} strokeWidth="0.8" opacity="0.4" />
                    <line x1="-20" y1="0" x2="20" y2="0" stroke={c.stroke} strokeWidth="0.8" opacity="0.4" />
                    <line x1="-20" y1="12" x2="20" y2="12" stroke={c.stroke} strokeWidth="0.8" opacity="0.4" />
                    {/* Status dots */}
                    <circle cx="-14" cy="-6" r="2" fill={c.stroke} opacity="0.6" />
                    <circle cx="-14" cy="6" r="2" fill={c.stroke} opacity="0.6" />
                    <circle cx="-14" cy="18" r="2" fill={c.stroke} opacity="0.6" />
                </g>
            );
        /* SESSION — Rounded card with file icon */
        case "session":
            return (
                <g>
                    <rect x="-28" y="-30" width="56" height="60" rx="12" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* File/memory icon */}
                    <path d="M-10,-16 L6,-16 L12,-10 L12,16 L-10,16 Z" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.6" />
                    <path d="M6,-16 L6,-10 L12,-10" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.6" />
                    <line x1="-6" y1="-6" x2="8" y2="-6" stroke={c.stroke} strokeWidth="0.7" opacity="0.4" />
                    <line x1="-6" y1="0" x2="8" y2="0" stroke={c.stroke} strokeWidth="0.7" opacity="0.4" />
                    <line x1="-6" y1="6" x2="4" y2="6" stroke={c.stroke} strokeWidth="0.7" opacity="0.4" />
                </g>
            );
        /* MCP — Server/terminal shape */
        case "mcp":
            return (
                <g>
                    <rect x="-30" y="-32" width="60" height="64" rx="6" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Terminal prompt */}
                    <text x="-16" y="-10" fontSize="10" fill={c.stroke} opacity="0.7" fontFamily="monospace">{">"}_</text>
                    {/* Server rack lines */}
                    <line x1="-20" y1="2" x2="20" y2="2" stroke={c.stroke} strokeWidth="0.7" opacity="0.3" />
                    <circle cx="-14" cy="10" r="2" fill={c.stroke} opacity="0.5" />
                    <circle cx="-8" cy="10" r="2" fill={c.stroke} opacity="0.5" />
                    <line x1="-20" y1="18" x2="20" y2="18" stroke={c.stroke} strokeWidth="0.7" opacity="0.3" />
                </g>
            );
        /* LLM — AI brain chip */
        case "llm":
            return (
                <g>
                    <rect x="-30" y="-30" width="60" height="60" rx="10" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />
                    {/* Chip pins */}
                    <line x1="-20" y1="-30" x2="-20" y2="-36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="-8" y1="-30" x2="-8" y2="-36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="8" y1="-30" x2="8" y2="-36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="20" y1="-30" x2="20" y2="-36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="-20" y1="30" x2="-20" y2="36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="-8" y1="30" x2="-8" y2="36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="8" y1="30" x2="8" y2="36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    <line x1="20" y1="30" x2="20" y2="36" stroke={c.stroke} strokeWidth="1" opacity="0.4" />
                    {/* AI text */}
                    <text textAnchor="middle" y="4" fontSize="16" fill={c.stroke} opacity="0.7" fontWeight="800" fontFamily="monospace">AI</text>
                </g>
            );
        default:
            return <circle r="34" fill={c.fill} stroke={c.stroke} strokeWidth="1.5" />;
    }
}

/* ─── SVG Node Rendering ─────────────────────────────────────────────── */
function CanvasNode({ node, isActive, isComplete, onClick }: {
    node: { id: string; label: string; type: string; x: number; y: number };
    isActive: boolean;
    isComplete: boolean;
    onClick: () => void;
}) {
    const colorMap: Record<string, { stroke: string; fill: string; glow: string }> = {
        agent: { stroke: "#6366f1", fill: "#12121e", glow: "rgba(99,102,241,0.5)" },
        ipfs: { stroke: "#10b981", fill: "#081410", glow: "rgba(16,185,129,0.5)" },
        ucan: { stroke: "#8b5cf6", fill: "#100d1a", glow: "rgba(139,92,246,0.5)" },
        zama: { stroke: "#f59e0b", fill: "#141008", glow: "rgba(245,158,11,0.5)" },
        ipns: { stroke: "#ec4899", fill: "#140812", glow: "rgba(236,72,153,0.5)" },
        gateway: { stroke: "#22d3ee", fill: "#081214", glow: "rgba(34,211,238,0.5)" },
        registry: { stroke: "#14b8a6", fill: "#081412", glow: "rgba(20,184,166,0.5)" },
        session: { stroke: "#a78bfa", fill: "#0d0c14", glow: "rgba(167,139,250,0.5)" },
        mcp: { stroke: "#06b6d4", fill: "#081214", glow: "rgba(6,182,212,0.5)" },
        llm: { stroke: "#f472b6", fill: "#140a10", glow: "rgba(244,114,182,0.5)" },
    };

    const c = colorMap[node.type] || colorMap.agent;

    return (
        <g
            transform={`translate(${node.x}, ${node.y})`}
            onClick={onClick}
            style={{ cursor: "pointer" }}
            className="mc-canvas-node"
        >
            {/* Glow ring */}
            {isActive && (
                <circle r="46" fill="none" stroke={c.stroke} strokeWidth="1" opacity="0.25">
                    <animate attributeName="r" values="46;54;46" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.25;0.08;0.25" dur="2s" repeatCount="indefinite" />
                </circle>
            )}
            {/* Custom shape */}
            <g
                stroke={isComplete ? "#10b981" : isActive ? c.stroke : "#222"}
                style={isActive ? { filter: `drop-shadow(0 0 14px ${c.glow})` } : {}}
            >
                <NodeShape type={node.type} c={{
                    stroke: isComplete ? "#10b981" : isActive ? c.stroke : "#2a2a3a",
                    fill: c.fill,
                }} />
            </g>
            {/* Label */}
            <text textAnchor="middle" y="48" fontSize="9" fill={isActive ? "#ddd" : "#666"} fontFamily="'Inter', sans-serif" fontWeight="700" letterSpacing="0.03em">
                {node.label}
            </text>
            {/* Status dot */}
            {isComplete && (
                <g>
                    <circle cx="26" cy="-26" r="7" fill="#0a0a0c" />
                    <circle cx="26" cy="-26" r="5" fill="#10b981" />
                    <text x="26" y="-23" textAnchor="middle" fontSize="7" fill="#fff">✓</text>
                </g>
            )}
        </g>
    );
}

/* ─── Main Canvas ────────────────────────────────────────────────────── */
export default function SimCanvas({
    scenario, currentStepIndex, totalSteps, isRunning, onNodeClick, onStepChange
}: SimCanvasProps) {
    if (!scenario) {
        return (
            <div className="mc-canvas">
                <div className="mc-canvas-empty">
                    <div className="mc-canvas-empty-icon">◈</div>
                    <h2>AgentDB Simulation Lab</h2>
                    <p>Select a simulation from the sidebar to begin</p>
                    <div className="mc-canvas-hints">
                        <span>🧪 10 interactive scenarios</span>
                        <span>🎮 Click nodes to inspect</span>
                        <span>⏱ Scrub the timeline</span>
                    </div>
                </div>
            </div>
        );
    }

    const currentStep: SimStep | undefined = scenario.steps[currentStepIndex];
    const activeNodes = currentStep?.activeNodes || [];
    const activeConns = currentStep?.activeConnections || [];
    const completedNodes = new Set<string>();
    for (let i = 0; i < currentStepIndex; i++) {
        scenario.steps[i].activeNodes.forEach((n) => completedNodes.add(n));
    }

    return (
        <div className="mc-canvas">
            {/* Header bar */}
            <div className="mc-canvas-header">
                <div className="mc-canvas-sim-name">
                    <span className="icon">{scenario.icon}</span>
                    <span>{scenario.name}</span>
                </div>
                {currentStep && (
                    <div className="mc-canvas-phase-badge">
                        Step {currentStepIndex + 1}/{totalSteps}: {currentStep.label}
                    </div>
                )}
            </div>

            {/* SVG Scene */}
            <div className="mc-canvas-svg-wrap">
                <div className="mc-canvas-grid" />
                <svg viewBox="0 0 700 420" fill="none" xmlns="http://www.w3.org/2000/svg" className="mc-canvas-svg">
                    <defs>
                        <filter id="mcglow" x="-30%" y="-30%" width="160%" height="160%">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#333" />
                        </marker>
                        <marker id="arrowhead-active" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
                        </marker>
                    </defs>

                    {/* Connections */}
                    {scenario.connections.map((conn) => {
                        const fromNode = scenario.nodes.find(n => n.id === conn.from);
                        const toNode = scenario.nodes.find(n => n.id === conn.to);
                        if (!fromNode || !toNode) return null;

                        const isActive = activeConns.includes(conn.id);
                        const midX = (fromNode.x + toNode.x) / 2;
                        const midY = (fromNode.y + toNode.y) / 2 - 30;
                        const pathD = `M${fromNode.x} ${fromNode.y} Q${midX} ${midY} ${toNode.x} ${toNode.y}`;

                        return (
                            <g key={conn.id}>
                                <path
                                    d={pathD}
                                    stroke={isActive ? "#6366f1" : "#1a1a2e"}
                                    strokeWidth={isActive ? 2 : 1}
                                    strokeDasharray={isActive ? "6 3" : "4 6"}
                                    fill="none"
                                    markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                                    className={isActive ? "mc-conn-active" : ""}
                                />
                                {isActive && (
                                    <circle r="4" fill="#6366f1" filter="url(#mcglow)">
                                        <animateMotion dur="1.5s" repeatCount="indefinite" path={pathD} />
                                    </circle>
                                )}
                                {conn.label && isActive && (
                                    <text x={midX} y={midY - 6} textAnchor="middle" fontSize="7" fill="#6366f1" fontFamily="'Inter', sans-serif" fontWeight="600">
                                        {conn.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Nodes */}
                    {scenario.nodes.map((node) => (
                        <CanvasNode
                            key={node.id}
                            node={node}
                            isActive={activeNodes.includes(node.id)}
                            isComplete={completedNodes.has(node.id)}
                            onClick={() => onNodeClick(node.id)}
                        />
                    ))}
                </svg>
            </div>

            {/* Timeline Slider */}
            <div className="mc-timeline">
                <div className="mc-timeline-bar">
                    <input
                        type="range" min={0} max={Math.max(0, totalSteps - 1)}
                        value={currentStepIndex}
                        onChange={(e) => onStepChange(Number(e.target.value))}
                        className="mc-timeline-slider"
                    />
                    <div className="mc-timeline-progress" style={{ width: `${totalSteps > 1 ? (currentStepIndex / (totalSteps - 1)) * 100 : 0}%` }} />
                </div>
                <div className="mc-timeline-steps">
                    {scenario.steps.map((step, i) => (
                        <button
                            key={i}
                            className={`mc-timeline-step ${i === currentStepIndex ? "active" : i < currentStepIndex ? "done" : ""}`}
                            onClick={() => onStepChange(i)}
                            title={step.label}
                        >
                            <span className="mc-step-dot" />
                            <span className="mc-step-label">{step.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
