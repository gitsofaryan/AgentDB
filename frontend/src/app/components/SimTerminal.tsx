"use client";

import React from "react";

export interface LogEntry {
    id: number;
    timestamp: string;
    prefix: string;
    message: string;
    color: string;
}

const PREFIX_COLORS: Record<string, string> = {
    INFO: "#6366f1",
    STORE: "#10b981",
    UCAN: "#8b5cf6",
    VERIFY: "#22d3ee",
    GATEWAY: "#f59e0b",
    FHE: "#ef4444",
    IPNS: "#ec4899",
    ERROR: "#ef4444",
    AGENT: "#6366f1",
    SYSTEM: "#71717a",
    MIGRATE: "#14b8a6",
    CONFLICT: "#f97316",
};

export function getLogColor(prefix: string): string {
    return PREFIX_COLORS[prefix] || "#71717a";
}

interface SimTerminalProps {
    logs: LogEntry[];
    onClear: () => void;
    isPaused: boolean;
    onTogglePause: () => void;
    isOpen: boolean;
    onToggleOpen: () => void;
    height: number;
    onHeightChange: (h: number) => void;
}

export default function SimTerminal({
    logs, onClear, isPaused, onTogglePause,
    isOpen, onToggleOpen, height, onHeightChange,
}: SimTerminalProps) {
    const bodyRef = React.useRef<HTMLDivElement>(null);
    const isDragging = React.useRef(false);
    const startY = React.useRef(0);
    const startH = React.useRef(0);

    React.useEffect(() => {
        if (!isPaused && bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    const handleCopy = () => {
        const text = logs.map(l => `[${l.timestamp}] [${l.prefix}] ${l.message}`).join("\n");
        navigator.clipboard.writeText(text);
    };

    /* ─── Drag to Resize ─────────────────────────────────────────────── */
    const onDragStart = React.useCallback((e: React.MouseEvent) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startH.current = height;
        document.body.style.cursor = "ns-resize";
        document.body.style.userSelect = "none";

        const onMove = (ev: MouseEvent) => {
            if (!isDragging.current) return;
            const delta = startY.current - ev.clientY;
            const newH = Math.max(60, Math.min(600, startH.current + delta));
            onHeightChange(newH);
        };
        const onUp = () => {
            isDragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }, [height, onHeightChange]);

    /* ─── Collapsed bar ──────────────────────────────────────────────── */
    if (!isOpen) {
        return (
            <div className="mc-terminal mc-terminal-collapsed" onClick={onToggleOpen}>
                <div className="mc-terminal-header">
                    <div className="mc-terminal-dots">
                        <span className="dot red" />
                        <span className="dot yellow" />
                        <span className="dot green" />
                    </div>
                    <span className="mc-terminal-title">agent-db-kernel.log</span>
                    <div className="mc-terminal-actions">
                        <span className="mc-term-btn">▲ Open Terminal ({logs.length} logs)</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mc-terminal" style={{ height }}>
            {/* Drag resize handle */}
            <div className="mc-terminal-resize" onMouseDown={onDragStart} />
            <div className="mc-terminal-header">
                <div className="mc-terminal-dots">
                    <span className="dot red" />
                    <span className="dot yellow" />
                    <span className="dot green" />
                </div>
                <span className="mc-terminal-title">agent-db-kernel.log</span>
                <div className="mc-terminal-actions">
                    <button onClick={onTogglePause} className="mc-term-btn">
                        {isPaused ? "▶ Resume" : "⏸ Pause"}
                    </button>
                    <button onClick={handleCopy} className="mc-term-btn">📋 Copy</button>
                    <button onClick={onClear} className="mc-term-btn">🗑 Clear</button>
                    <button onClick={onToggleOpen} className="mc-term-btn">▼ Close</button>
                </div>
            </div>
            <div className="mc-terminal-body" ref={bodyRef}>
                {logs.length === 0 && (
                    <div className="mc-term-line muted">Waiting for simulation events...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="mc-term-line">
                        <span className="mc-term-ts">{log.timestamp}</span>
                        <span className="mc-term-prefix" style={{ color: log.color }}>[{log.prefix}]</span>
                        <span className="mc-term-msg">{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
