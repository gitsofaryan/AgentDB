"use client";

import React from "react";

/* ─── Simulation Scenario Definitions ────────────────────────────────── */
export interface SimScenario {
    id: string;
    name: string;
    icon: string;
    description: string;
    steps: SimStep[];
    nodes: SimNode[];
    connections: SimConnection[];
}

export interface SimStep {
    phase: string;
    label: string;
    activeNodes: string[];
    activeConnections: string[];
    logPrefix: string;
    logMessage: string;
    inspectTarget?: string;
}

export interface SimNode {
    id: string;
    label: string;
    type: "agent" | "ipfs" | "ucan" | "zama" | "ipns" | "gateway" | "registry" | "session" | "mcp" | "llm";
    x: number;
    y: number;
    did?: string;
    cid?: string;
    capabilities?: string[];
    expiry?: string;
    encryptionType?: string;
    gatewayMs?: number;
}

export interface SimConnection {
    id: string;
    from: string;
    to: string;
    label?: string;
}

export interface SimParams {
    ucanExpiry: number;
    networkLatency: number;
    encryptionEnabled: boolean;
    gatewayFailure: boolean;
    agentCount: number;
}

/* ─── Sidebar Props ─────────────────────────────────────────────────── */
interface SimSidebarProps {
    scenarios: SimScenario[];
    activeScenario: string | null;
    isRunning: boolean;
    params: SimParams;
    onSelectScenario: (id: string) => void;
    onRunSimulation: () => void;
    onResetSimulation: () => void;
    onParamsChange: (params: SimParams) => void;
}

export default function SimSidebar({
    scenarios, activeScenario, isRunning, params,
    onSelectScenario, onRunSimulation, onResetSimulation, onParamsChange,
}: SimSidebarProps) {
    const [showParams, setShowParams] = React.useState(false);

    return (
        <aside className="mc-sidebar">
            {/* ── Fixed Top: Logo ─────────────────────────────────── */}
            <div className="mc-sidebar-logo">
                <span className="mc-logo-icon">◈</span>
                <div style={{ flex: 1 }}>
                    <div className="mc-logo-text">AgentDB</div>
                    <div className="mc-logo-sub">Simulation Lab</div>
                </div>
                <a
                    href="/"
                    style={{
                        fontSize: "0.72rem",
                        color: "#666",
                        textDecoration: "none",
                        padding: "4px 10px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "6px",
                        transition: "all 0.2s",
                        whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = "rgba(99,102,241,0.3)"; (e.target as HTMLElement).style.color = "#aaa"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.color = "#666"; }}
                >
                    ← About
                </a>
            </div>

            {/* ── Scrollable Middle: Simulation Cards ────────────── */}
            <div className="mc-sidebar-scroll">
                <div className="mc-sidebar-section-title">🧪 Simulations</div>
                {scenarios.map((s) => (
                    <button
                        key={s.id}
                        className={`mc-sim-card ${activeScenario === s.id ? "active" : ""}`}
                        onClick={() => onSelectScenario(s.id)}
                    >
                        <span className="mc-sim-icon">{s.icon}</span>
                        <div className="mc-sim-info">
                            <div className="mc-sim-name">{s.name}</div>
                            <div className="mc-sim-desc">{s.description}</div>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Fixed Bottom: Controls + Parameters ────────────── */}
            <div className="mc-sidebar-bottom">
                <div className="mc-sidebar-controls">
                    <button
                        className={`mc-run-btn ${isRunning ? "running" : ""}`}
                        onClick={isRunning ? onResetSimulation : onRunSimulation}
                        disabled={!activeScenario}
                    >
                        {isRunning ? "⏹ Stop" : "▶ Run Simulation"}
                    </button>
                    <button className="mc-reset-btn" onClick={onResetSimulation} disabled={!activeScenario}>
                        ↻ Reset
                    </button>
                </div>
                <button className="mc-params-toggle" onClick={() => setShowParams(!showParams)}>
                    ⚙️ Parameters {showParams ? "▴" : "▾"}
                </button>
                {showParams && (
                    <div className="mc-params-panel">
                        <div className="mc-param">
                            <label>UCAN Expiry</label>
                            <select
                                value={params.ucanExpiry}
                                onChange={(e) => onParamsChange({ ...params, ucanExpiry: Number(e.target.value) })}
                            >
                                <option value={1}>1 hour</option>
                                <option value={24}>24 hours</option>
                                <option value={168}>7 days</option>
                            </select>
                        </div>
                        <div className="mc-param">
                            <label>Network Latency</label>
                            <input
                                type="range" min="50" max="2000" step="50"
                                value={params.networkLatency}
                                onChange={(e) => onParamsChange({ ...params, networkLatency: Number(e.target.value) })}
                            />
                            <span className="mc-param-val">{params.networkLatency}ms</span>
                        </div>
                        <div className="mc-param toggle">
                            <label>Encryption</label>
                            <button
                                className={`mc-toggle ${params.encryptionEnabled ? "on" : ""}`}
                                onClick={() => onParamsChange({ ...params, encryptionEnabled: !params.encryptionEnabled })}
                            >
                                {params.encryptionEnabled ? "ON" : "OFF"}
                            </button>
                        </div>
                        <div className="mc-param toggle">
                            <label>Gateway Failure</label>
                            <button
                                className={`mc-toggle ${params.gatewayFailure ? "on" : ""}`}
                                onClick={() => onParamsChange({ ...params, gatewayFailure: !params.gatewayFailure })}
                            >
                                {params.gatewayFailure ? "ON" : "OFF"}
                            </button>
                        </div>
                        <div className="mc-param">
                            <label>Agent Count</label>
                            <select
                                value={params.agentCount}
                                onChange={(e) => onParamsChange({ ...params, agentCount: Number(e.target.value) })}
                            >
                                <option value={2}>2 Agents</option>
                                <option value={3}>3 Agents</option>
                                <option value={5}>5 Agents</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
