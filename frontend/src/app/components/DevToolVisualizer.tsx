"use client";

import { useState, useEffect, useImperativeHandle, forwardRef, useRef } from "react";

export interface LogEntry {
    id: number;
    time: string;
    tag: "STORACHA" | "UCAN" | "ZAMA" | "SYSTEM";
    msg: string;
}

export interface DevToolVisualizerRef {
    addLog: (tag: LogEntry["tag"], msg: string) => void;
    triggerAnimation: (type: "upload" | "auth" | "encrypt") => void;
}

const DevToolVisualizer = forwardRef<DevToolVisualizerRef>((_, ref) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [activeNode, setActiveNode] = useState<string | null>(null);
    const [activePath, setActivePath] = useState<string | null>(null);

    // Use indices for smoother data flow simulation
    const [packetPos, setPacketPos] = useState<number>(0);
    const [isPacketVisible, setIsPacketVisible] = useState(false);

    useImperativeHandle(ref, () => ({
        addLog: (tag, msg) => {
            const newEntry: LogEntry = {
                id: Date.now(),
                time: new Date().toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 1 }).split(' ')[0],
                tag,
                msg,
            };
            setLogs((prev) => [newEntry, ...prev].slice(0, 50));
        },
        triggerAnimation: (type) => {
            setIsPacketVisible(true);
            if (type === "upload") {
                setActivePath("agent-storacha");
                animatePacket(() => {
                    setActiveNode("storacha");
                    setTimeout(() => setActiveNode(null), 1000);
                    setActivePath(null);
                });
            } else if (type === "auth") {
                setActivePath("agent-ucan");
                animatePacket(() => {
                    setActiveNode("ucan");
                    setTimeout(() => setActiveNode(null), 1000);
                    setActivePath(null);
                });
            } else if (type === "encrypt") {
                setActivePath("agent-zama");
                animatePacket(() => {
                    setActiveNode("zama");
                    setTimeout(() => setActiveNode(null), 1000);
                    setActivePath(null);
                });
            }
        }
    }));

    const animatePacket = (onComplete: () => void) => {
        let start = 0;
        const duration = 800;
        const startTime = performance.now();

        const frame = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            setPacketPos(progress);

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                setIsPacketVisible(false);
                setPacketPos(0);
                onComplete();
            }
        };
        requestAnimationFrame(frame);
    };

    // Node Definitions with icons from standard emoji/text for compatibility
    const nodes = {
        agent: { id: 'agent', label: 'MASTER AGENT', x: 15, y: 50, icon: '🤖' },
        storacha: { id: 'storacha', label: 'STORACHA', x: 50, y: 20, icon: '☁️' },
        ucan: { id: 'ucan', label: 'UCAN-AUTH', x: 50, y: 50, icon: '🔑' },
        zama: { id: 'zama', label: 'ZAMA-FHE', x: 50, y: 80, icon: '🛡️' },
        target: { id: 'target', label: 'SUB-AGENT', x: 85, y: 50, icon: '🤖' },
    };

    // SVG Path Helper
    const getPath = (n1: any, n2: any) => {
        return `M ${n1.x}% ${n1.y}% Q ${(n1.x + n2.x) / 2}% ${n2.y}% ${n2.x}% ${n2.y}%`;
    };

    return (
        <div className="dev-tool-container">
            <div className="visualizer-canvas">
                <svg className="svg-overlay">
                    <defs>
                        <filter id="glow">
                            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Paths */}
                    <path className={`connector-path ${activePath === 'agent-storacha' ? 'active' : ''}`} d={getPath(nodes.agent, nodes.storacha)} />
                    <path className={`connector-path ${activePath === 'agent-ucan' ? 'active' : ''}`} d={getPath(nodes.agent, nodes.ucan)} />
                    <path className={`connector-path ${activePath === 'agent-zama' ? 'active' : ''}`} d={getPath(nodes.agent, nodes.zama)} />
                    <path className="connector-path" d={getPath(nodes.ucan, nodes.target)} />

                    {/* Animated Packet */}
                    {isPacketVisible && activePath && (
                        <circle className="packet" r="6" filter="url(#glow)">
                            <animateMotion
                                dur="0.8s"
                                repeatCount="1"
                                path={activePath === 'agent-storacha' ? getPath(nodes.agent, nodes.storacha) :
                                    activePath === 'agent-ucan' ? getPath(nodes.agent, nodes.ucan) :
                                        getPath(nodes.agent, nodes.zama)}
                            />
                        </circle>
                    )}
                </svg>

                {Object.values(nodes).map((n) => (
                    <div
                        key={n.id}
                        className={`node ${activeNode === n.id ? 'active' : ''}`}
                        style={{ left: `${n.x}%`, top: `${n.y}%`, transform: `translate(-50%, -50%) ${activeNode === n.id ? 'scale(1.1)' : ''}` }}
                    >
                        <i>{n.icon}</i>
                        <b>{n.label}</b>
                    </div>
                ))}
            </div>

            <div className="event-log">
                <div className="log-header">System Debug Console</div>
                {logs.length === 0 && (
                    <div className="log-entry" style={{ opacity: 0.3 }}>&gt; Waiting for agent kernel events...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="log-entry">
                        <span className={`log-tag tag-${log.tag.toLowerCase()}`}>{log.tag}</span>
                        <span className="log-msg">{log.msg}</span>
                    </div>
                ))}
            </div>
        </div>
    );
});

DevToolVisualizer.displayName = "DevToolVisualizer";
export default DevToolVisualizer;
