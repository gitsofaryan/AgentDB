"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./get-started.css";

/* ─── Warp Lightning Header Canvas ─────────────────────────────────── */
function WarpCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        let raf: number;
        let w = canvas.offsetWidth;
        let h = canvas.offsetHeight;
        canvas.width = w;
        canvas.height = h;

        // Stars
        const STARS = 220;
        const stars = Array.from({ length: STARS }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            z: Math.random() * w,
            pz: 0,
        }));
        // Bolts
        interface Bolt { x: number; y: number; life: number; len: number; angle: number; color: string }
        const BOLT_COLORS = ["#6366f1", "#818cf8", "#10b981", "#38bdf8", "#a78bfa"];
        const bolts: Bolt[] = [];
        let frame = 0;

        function spawnBolt() {
            const cx = w / 2;
            const cy = h / 2;
            const angle = Math.random() * Math.PI * 2;
            bolts.push({
                x: cx + Math.cos(angle) * (Math.random() * 60 + 20),
                y: cy + Math.sin(angle) * (Math.random() * 30 + 10),
                life: 0,
                len: 80 + Math.random() * 140,
                angle,
                color: BOLT_COLORS[Math.floor(Math.random() * BOLT_COLORS.length)],
            });
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);
            // dark bg
            ctx.fillStyle = "#06060f";
            ctx.fillRect(0, 0, w, h);
            // vignette
            const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
            vg.addColorStop(0, "transparent");
            vg.addColorStop(1, "rgba(6,6,15,0.7)");
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, w, h);

            // warp stars
            const cx = w / 2, cy = h / 2;
            stars.forEach((s) => {
                s.pz = s.z;
                s.z -= 5 + frame * 0.015;
                if (s.z <= 0) { s.x = Math.random() * w; s.y = Math.random() * h; s.z = w; s.pz = w; }
                const sx = (s.x - cx) * (w / s.z) + cx;
                const sy = (s.y - cy) * (w / s.z) + cy;
                const px = (s.x - cx) * (w / s.pz) + cx;
                const py = (s.y - cy) * (w / s.pz) + cy;
                const size = Math.max(0, (1 - s.z / w) * 2.5);
                const bright = Math.min(1, (1 - s.z / w) * 1.4);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.strokeStyle = `rgba(160,160,255,${bright * 0.7})`;
                ctx.lineWidth = size;
                ctx.stroke();
            });

            // lightning bolts
            if (frame % 12 === 0 && bolts.length < 8) spawnBolt();
            for (let i = bolts.length - 1; i >= 0; i--) {
                const b = bolts[i];
                b.life += 1;
                const progress = b.life / 18;
                if (progress > 1) { bolts.splice(i, 1); continue; }
                const alpha = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;
                const ex = b.x + Math.cos(b.angle) * b.len * Math.min(1, progress * 2.5);
                const ey = b.y + Math.sin(b.angle) * b.len * Math.min(1, progress * 2.5);
                // jitter path
                const seg = 5;
                ctx.save();
                ctx.shadowColor = b.color;
                ctx.shadowBlur = 12;
                ctx.strokeStyle = b.color.replace(")", `,${alpha * 0.9})`).replace("rgb", "rgba");
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                for (let s = 1; s <= seg; s++) {
                    const t = s / seg;
                    const jx = (b.x + (ex - b.x) * t) + (s < seg ? (Math.random() - 0.5) * 12 : 0);
                    const jy = (b.y + (ey - b.y) * t) + (s < seg ? (Math.random() - 0.5) * 6 : 0);
                    ctx.lineTo(jx, jy);
                }
                ctx.stroke();
                // glow core
                ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
            }

            frame++;
            raf = requestAnimationFrame(draw);
        }
        draw();

        const resize = () => {
            w = canvas.offsetWidth; h = canvas.offsetHeight;
            canvas.width = w; canvas.height = h;
        };
        window.addEventListener("resize", resize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, []);
    return <canvas ref={canvasRef} className="gs-warp-canvas" aria-hidden="true" />;
}

/* ─── Copy button ───────────────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button className="gs-copy-btn" onClick={copy} aria-label="Copy to clipboard" title="Copy">
            {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            )}
            {copied ? "Copied!" : "Copy"}
        </button>
    );
}

/* ─── Code block ────────────────────────────────────────────────────── */
interface Token { text: string; type: "keyword" | "string" | "comment" | "fn" | "var" | "plain" | "num" }

function highlight(code: string): Token[] {
    const tokens: Token[] = [];
    const lines = code.split("\n");
    for (const line of lines) {
        const trimmed = line.trimStart();
        if (trimmed.startsWith("//") || trimmed.startsWith("#")) {
            tokens.push({ text: line + "\n", type: "comment" });
            continue;
        }
        // simple tokeniser
        const parts = line.split(/(\b(const|let|await|async|import|from|export|default|return|new)\b|'[^']*'|"[^"]*"|`[^`]*`|\b\d+\b)/g);
        for (const p of parts) {
            if (!p) continue;
            if (/^(const|let|await|async|import|from|export|default|return|new)$/.test(p)) tokens.push({ text: p, type: "keyword" });
            else if (/^['"`]/.test(p)) tokens.push({ text: p, type: "string" });
            else if (/^\d+$/.test(p)) tokens.push({ text: p, type: "num" });
            else tokens.push({ text: p, type: "plain" });
        }
        tokens.push({ text: "\n", type: "plain" });
    }
    return tokens;
}

function CodeBlock({ code, lang = "bash", noHighlight = false }: { code: string; lang?: string; noHighlight?: boolean }) {
    const tokens = noHighlight ? null : highlight(code);
    return (
        <div className="gs-code-block">
            <div className="gs-code-header">
                <span className="gs-code-lang">{lang}</span>
                <CopyBtn text={code.trim()} />
            </div>
            <pre className="gs-code-pre">
                {noHighlight || !tokens ? (
                    <code className="gs-code-bash">{code.trim()}</code>
                ) : (
                    <code>
                        {tokens.map((t, i) => (
                            <span key={i} className={`gs-tok-${t.type}`}>{t.text}</span>
                        ))}
                    </code>
                )}
            </pre>
        </div>
    );
}

/* ─── Step illustrations (SVG) ──────────────────────────────────────── */

function IlluInstall() {
    return (
        <svg viewBox="0 0 280 200" fill="none" className="gs-step-svg" aria-label="npm install">
            {/* terminal window */}
            <rect x="10" y="20" width="260" height="160" rx="12" fill="#0c0d18" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5" />
            {/* title bar */}
            <rect x="10" y="20" width="260" height="32" rx="12" fill="#111222" />
            <rect x="10" y="40" width="260" height="12" fill="#111222" />
            <circle cx="30" cy="36" r="5" fill="#ef4444" opacity="0.7" />
            <circle cx="46" cy="36" r="5" fill="#f59e0b" opacity="0.7" />
            <circle cx="62" cy="36" r="5" fill="#10b981" opacity="0.7" />
            <text x="140" y="40" fontSize="9" fill="#4444aa" textAnchor="middle" fontFamily="monospace">bash</text>
            {/* npm install */}
            <text x="24" y="75" fontSize="8.5" fill="#6366f1" fontFamily="monospace">$</text>
            <text x="34" y="75" fontSize="8.5" fill="#e8e8f0" fontFamily="monospace">npm install @arienjain/agent-db</text>
            {/* progress bars */}
            <rect x="24" y="88" width="220" height="5" rx="2.5" fill="#1a1a30" />
            <rect x="24" y="88" width="160" height="5" rx="2.5" fill="#6366f1" opacity="0.8" />
            <rect x="24" y="100" width="220" height="5" rx="2.5" fill="#1a1a30" />
            <rect x="24" y="100" width="200" height="5" rx="2.5" fill="#10b981" opacity="0.7" />
            <rect x="24" y="112" width="220" height="5" rx="2.5" fill="#1a1a30" />
            <rect x="24" y="112" width="80" height="5" rx="2.5" fill="#f59e0b" opacity="0.6" />
            {/* success */}
            <text x="24" y="133" fontSize="8" fill="#10b981" fontFamily="monospace">✓ added 47 packages</text>
            <text x="24" y="146" fontSize="8" fill="#10b981" fontFamily="monospace">✓ agent-db@1.3.0 installed</text>
            {/* npm badge */}
            <rect x="186" y="155" width="72" height="18" rx="4" fill="rgba(16,185,129,0.1)" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <text x="222" y="167" fontSize="7" fill="#10b981" textAnchor="middle" fontFamily="monospace">v1.3.0 · MIT</text>
        </svg>
    );
}

function IlluStoracha() {
    return (
        <svg viewBox="0 0 280 200" fill="none" className="gs-step-svg" aria-label="Storacha setup">
            {/* cloud structure */}
            <ellipse cx="140" cy="90" rx="70" ry="45" fill="#0a1020" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            <ellipse cx="105" cy="75" rx="40" ry="30" fill="#0a1020" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            <ellipse cx="175" cy="72" rx="35" ry="28" fill="#0a1020" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            {/* IPFS text in cloud */}
            <text x="140" y="88" fontSize="13" fill="#10b981" textAnchor="middle" fontFamily="monospace" fontWeight="700">IPFS</text>
            <text x="140" y="103" fontSize="7.5" fill="#10b981" textAnchor="middle" fontFamily="monospace" opacity="0.6">Storacha Network</text>
            {/* DID key pill */}
            <rect x="40" y="148" width="80" height="22" rx="6" fill="#0d0f1c" stroke="rgba(99,102,241,0.3)" strokeWidth="1" />
            <text x="80" y="163" fontSize="7" fill="#818cf8" textAnchor="middle" fontFamily="monospace">did:key:z6Mk…</text>
            {/* Space pill */}
            <rect x="160" y="148" width="78" height="22" rx="6" fill="#0d0f1c" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <text x="199" y="163" fontSize="7" fill="#10b981" textAnchor="middle" fontFamily="monospace">space:AgentNode</text>
            {/* connectors */}
            <line x1="80" y1="148" x2="120" y2="120" stroke="rgba(99,102,241,0.3)" strokeWidth="1" strokeDasharray="3 2" />
            <line x1="199" y1="148" x2="165" y2="120" stroke="rgba(16,185,129,0.3)" strokeWidth="1" strokeDasharray="3 2" />
            {/* upload arrow */}
            <polygon points="140,52 133,62 147,62" fill="rgba(16,185,129,0.6)" />
            <line x1="140" y1="30" x2="140" y2="62" stroke="rgba(16,185,129,0.5)" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="140" y="23" fontSize="8" fill="#10b981" textAnchor="middle" fontFamily="monospace">your agent</text>
        </svg>
    );
}

function IlluIdentity() {
    return (
        <svg viewBox="0 0 280 200" fill="none" className="gs-step-svg" aria-label="Agent identity">
            {/* shield */}
            <path d="M140 18 L200 45 L200 110 Q200 155 140 178 Q80 155 80 110 L80 45 Z" fill="#0b0c1a" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
            {/* inner shield */}
            <path d="M140 32 L188 55 L188 108 Q188 143 140 162 Q92 143 92 108 L92 55 Z" fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth="1" />
            {/* lock */}
            <rect x="124" y="90" width="32" height="26" rx="5" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
            <path d="M130 90 Q130 78 140 78 Q150 78 150 90" stroke="rgba(99,102,241,0.6)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <circle cx="140" cy="104" r="4" fill="rgba(99,102,241,0.7)" />
            <line x1="140" y1="108" x2="140" y2="112" stroke="rgba(99,102,241,0.5)" strokeWidth="2" />
            {/* DID label */}
            <rect x="94" y="142" width="92" height="20" rx="5" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
            <text x="140" y="156" fontSize="7.5" fill="#818cf8" textAnchor="middle" fontFamily="monospace">did:key:z6MkwaS…</text>
            {/* Ed25519 chip */}
            <rect x="105" y="58" width="70" height="16" rx="4" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
            <text x="140" y="69" fontSize="7" fill="#10b981" textAnchor="middle" fontFamily="monospace">Ed25519 keygen</text>
            {/* sparkles */}
            {[[72, 42], [208, 40], [68, 130], [212, 128]].map(([x, y], i) => (
                <g key={i}>
                    <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
                    <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
                </g>
            ))}
        </svg>
    );
}

function IlluMemory() {
    return (
        <svg viewBox="0 0 280 200" fill="none" className="gs-step-svg" aria-label="Store memory">
            {/* agent box */}
            <rect x="14" y="70" width="70" height="60" rx="10" fill="#0c0d1a" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
            <rect x="22" y="78" width="54" height="36" rx="6" fill="#090a14" stroke="#1e1f2e" strokeWidth="1" />
            <circle cx="38" cy="96" r="5" fill="#6366f1" opacity="0.7" />
            <circle cx="60" cy="96" r="5" fill="#6366f1" opacity="0.7" />
            <path d="M34 108 Q49 104 64 108" stroke="#6366f1" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
            <text x="49" y="143" fontSize="7" fill="#a1a1aa" textAnchor="middle" fontFamily="monospace">agent</text>
            {/* arrow */}
            <line x1="84" y1="100" x2="116" y2="100" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4 3" />
            <polygon points="116,97 110,100 116,103" fill="#6366f1" opacity="0.8" />
            <text x="100" y="92" fontSize="7" fill="#6366f1" textAnchor="middle" fontFamily="monospace">storePublicMemory</text>
            {/* context box */}
            <rect x="120" y="60" width="100" height="80" rx="10" fill="#060811" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            <text x="170" y="80" fontSize="7" fill="#4444aa" textAnchor="middle" fontFamily="monospace">context.json</text>
            <text x="128" y="96" fontSize="6.5" fill="#10b981" fontFamily="monospace">{"{"}</text>
            <text x="136" y="107" fontSize="6.5" fill="#818cf8" fontFamily="monospace">task: "explore",</text>
            <text x="136" y="118" fontSize="6.5" fill="#818cf8" fontFamily="monospace">goal: "find-water"</text>
            <text x="128" y="129" fontSize="6.5" fill="#10b981" fontFamily="monospace">{"}"}</text>
            {/* CID badge */}
            <rect x="120" y="148" width="100" height="22" rx="6" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
            <text x="170" y="163" fontSize="7" fill="#10b981" textAnchor="middle" fontFamily="monospace">CID: bafybeigh4…</text>
            {/* ipfs globe */}
            <circle cx="238" cy="100" r="26" fill="#060811" stroke="rgba(16,185,129,0.15)" strokeWidth="1.5" />
            <ellipse cx="238" cy="100" rx="10" ry="26" stroke="rgba(16,185,129,0.12)" strokeWidth="1" fill="none" />
            <ellipse cx="238" cy="100" rx="26" ry="8" stroke="rgba(16,185,129,0.12)" strokeWidth="1" fill="none" />
            <text x="238" y="104" fontSize="8" fill="#10b981" textAnchor="middle" fontFamily="monospace" fontWeight="700">IPFS</text>
            {/* arrow to globe */}
            <line x1="220" y1="100" x2="212" y2="100" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3 2" />
            <polygon points="212,97 218,100 212,103" fill="#10b981" opacity="0.7" />
        </svg>
    );
}

function IlluDelegate() {
    return (
        <svg viewBox="0 0 280 200" fill="none" className="gs-step-svg" aria-label="UCAN delegation">
            {/* Agent A */}
            <rect x="14" y="60" width="58" height="50" rx="9" fill="#0c0d1a" stroke="rgba(99,102,241,0.35)" strokeWidth="1.5" />
            <rect x="20" y="67" width="46" height="30" rx="6" fill="#090a14" stroke="#1e1f2e" strokeWidth="1" />
            <circle cx="33" cy="83" r="4" fill="#6366f1" opacity="0.8" />
            <circle cx="53" cy="83" r="4" fill="#6366f1" opacity="0.8" />
            <text x="43" y="123" fontSize="7" fill="#818cf8" textAnchor="middle" fontFamily="monospace">Master</text>
            {/* Agent B */}
            <rect x="208" y="60" width="58" height="50" rx="9" fill="#0c0d1a" stroke="rgba(99,102,241,0.25)" strokeWidth="1.5" />
            <rect x="214" y="67" width="46" height="30" rx="6" fill="#090a14" stroke="#1e1f2e" strokeWidth="1" />
            <circle cx="227" cy="83" r="4" fill="#6366f1" opacity="0.5" />
            <circle cx="247" cy="83" r="4" fill="#6366f1" opacity="0.5" />
            <text x="237" y="123" fontSize="7" fill="#818cf8" textAnchor="middle" fontFamily="monospace">Sub-Agent</text>
            {/* UCAN token center */}
            <rect x="98" y="68" width="84" height="52" rx="9" fill="#0a0b1c" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
            <text x="140" y="85" fontSize="7.5" fill="#818cf8" textAnchor="middle" fontFamily="monospace" fontWeight="700">UCAN Token</text>
            <rect x="104" y="89" width="72" height="1" fill="rgba(99,102,241,0.2)" />
            <text x="140" y="101" fontSize="6.5" fill="#a1a1cc" textAnchor="middle" fontFamily="monospace">cap: agent/read</text>
            <text x="140" y="111" fontSize="6.5" fill="#a1a1cc" textAnchor="middle" fontFamily="monospace">exp: 24h • signed</text>
            {/* arrows */}
            <line x1="72" y1="85" x2="96" y2="85" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeDasharray="3 2" />
            <polygon points="96,82 90,85 96,88" fill="rgba(99,102,241,0.7)" />
            <line x1="184" y1="85" x2="207" y2="85" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeDasharray="3 2" />
            <polygon points="207,82 201,85 207,88" fill="rgba(99,102,241,0.7)" />
            {/* no-server tag */}
            <rect x="104" y="140" width="72" height="18" rx="5" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.25)" strokeWidth="1" />
            <text x="140" y="153" fontSize="7" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">No central server</text>
        </svg>
    );
}

function IlluFHE() {
    return (
        <svg viewBox="0 0 280 200" fill="none" className="gs-step-svg" aria-label="FHE private vault">
            {/* safe outline */}
            <rect x="60" y="30" width="160" height="140" rx="14" fill="#0b0c18" stroke="rgba(245,158,11,0.25)" strokeWidth="2" />
            {/* safe wheel */}
            <circle cx="140" cy="100" r="42" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="3" />
            <circle cx="140" cy="100" r="32" fill="#090a14" stroke="rgba(245,158,11,0.2)" strokeWidth="2" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                const r = (deg * Math.PI) / 180;
                return <line key={i} x1={140 + 18 * Math.cos(r)} y1={100 + 18 * Math.sin(r)} x2={140 + 32 * Math.cos(r)} y2={100 + 32 * Math.sin(r)} stroke="rgba(245,158,11,0.3)" strokeWidth="2" />;
            })}
            <circle cx="140" cy="100" r="12" fill="#0e0f1c" stroke="rgba(245,158,11,0.45)" strokeWidth="1.5" />
            <circle cx="140" cy="98" r="4" fill="rgba(245,158,11,0.2)" stroke="rgba(245,158,11,0.55)" strokeWidth="1.5" />
            <rect x="138" y="101" width="4" height="6" rx="1" fill="rgba(245,158,11,0.45)" />
            {/* corner data tags */}
            {[{ x: 70, y: 42, label: "FHE[ctx]" }, { x: 174, y: 42, label: "0xAF3E…" }, { x: 70, y: 150, label: "0x91C2…" }, { x: 174, y: 150, label: "FHE[key]" }].map(({ x, y, label }, i) => (
                <g key={i}>
                    <rect x={x - 22} y={y - 9} width="50" height="18" rx="4" fill="rgba(245,158,11,0.05)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
                    <text x={x + 3} y={y + 4} fontSize="7" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">{label}</text>
                </g>
            ))}
            <text x="140" y="158" fontSize="8" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">Zama fhEVM vault</text>
        </svg>
    );
}

/* ─── Step card ─────────────────────────────────────────────────────── */
function StepCard({ num, title, desc, children, accent = "#6366f1" }:
    { num: string; title: string; desc: string; children: React.ReactNode; accent?: string }) {
    return (
        <div className="gs-step-card" style={{ "--step-accent": accent } as React.CSSProperties}>
            <div className="gs-step-numbar">
                <span className="gs-step-num" style={{ color: accent, borderColor: accent }}>{num}</span>
                <div className="gs-step-line" style={{ background: accent }} />
            </div>
            <div className="gs-step-body">
                <h2 className="gs-step-title">{title}</h2>
                <p className="gs-step-desc">{desc}</p>
                {children}
            </div>
        </div>
    );
}

/* ─── Main ──────────────────────────────────────────────────────────── */
export default function GetStartedPage() {
    return (
        <div className="gs-root">

            {/* ── WARP HEADER ──────────────────────────────────────────── */}
            <header className="gs-header">
                <WarpCanvas />
                <div className="gs-header-content">
                    <Link href="/landing" className="gs-back-link">← Back</Link>
                    <div className="gs-header-center">
                        <div className="gs-header-badge">
                            <span className="gs-header-badge-dot" />
                            npm package
                        </div>
                        <h1 className="gs-header-title">Get Started with Agent DB</h1>
                        <p className="gs-header-sub">
                            Decentralized, encrypted, portable memory for your AI agents —<br />
                            running in 5 minutes
                        </p>
                        <div className="gs-header-links">
                            <a
                                href="https://www.npmjs.com/package/@arienjain/agent-db?activeTab=readme"
                                target="_blank"
                                rel="noreferrer"
                                className="gs-npm-link"
                                id="npm-package-link"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474C23.214 24 24 23.214 24 22.237V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" /></svg>
                                @arienjain/agent-db · v1.3.0
                            </a>
                            <a
                                href="https://github.com/IPFS-AI-Context-Flow"
                                target="_blank"
                                rel="noreferrer"
                                className="gs-gh-link"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>
                                Source
                            </a>
                        </div>
                    </div>
                    <div style={{ width: 48 }} />
                </div>
            </header>

            {/* ── QUICK INSTALL BANNER ─────────────────────────────────── */}
            <section className="gs-quick-install">
                <div className="gs-qi-inner">
                    <span className="gs-qi-label">Quick install</span>
                    <CodeBlock code="npm install @arienjain/agent-db" noHighlight lang="bash" />
                    <span className="gs-qi-or">or</span>
                    <CodeBlock code="pnpm add @arienjain/agent-db" noHighlight lang="bash" />
                </div>
            </section>

            {/* ── STEPS ────────────────────────────────────────────────── */}
            <main className="gs-main">

                {/* STEP 0 — Storacha */}
                <StepCard
                    num="00"
                    title="Provision your storage space (optional)"
                    desc="Agent DB works offline with simulated CIDs. For real decentralized persistence, set up a free Storacha bucket in 30 seconds."
                    accent="#10b981"
                >
                    <div className="gs-two-col">
                        <div className="gs-codes">
                            <CodeBlock code={`npm install -g @storacha/cli`} noHighlight lang="bash" />
                            <CodeBlock code={`storacha login`} noHighlight lang="bash" />
                            <CodeBlock code={`storacha space create "MyAgentNode"`} noHighlight lang="bash" />
                            <CodeBlock code={`storacha space use <SPACE_DID>`} noHighlight lang="bash" />
                        </div>
                        <div className="gs-illu-wrap">
                            <IlluStoracha />
                            <p className="gs-illu-caption">If you skip this step, the SDK falls back to local-only simulated CIDs so you can still build and test.</p>
                        </div>
                    </div>
                </StepCard>

                {/* STEP 1 — Install */}
                <StepCard
                    num="01"
                    title="Install the SDK"
                    desc="Add Agent DB to any Node.js project — Discord bots, LangChain pipelines, CLI tools, or bare scripts."
                    accent="#6366f1"
                >
                    <div className="gs-two-col">
                        <div className="gs-codes">
                            <p className="gs-small-label">Node.js / TypeScript</p>
                            <CodeBlock code={`npm install @arienjain/agent-db`} noHighlight lang="bash" />
                            <p className="gs-small-label">With TypeScript declarations included — no @types needed.</p>
                            <div className="gs-feature-list">
                                <div className="gs-feature-row"><span className="gs-dot" style={{ background: "#6366f1" }} />Self-sovereign Ed25519 identity</div>
                                <div className="gs-feature-row"><span className="gs-dot" style={{ background: "#10b981" }} />IPFS / IPNS memory (Storacha)</div>
                                <div className="gs-feature-row"><span className="gs-dot" style={{ background: "#f59e0b" }} />ECIES private vault</div>
                                <div className="gs-feature-row"><span className="gs-dot" style={{ background: "#818cf8" }} />UCAN zero-trust delegation</div>
                                <div className="gs-feature-row"><span className="gs-dot" style={{ background: "#fb7185" }} />LangChain memory adapter</div>
                            </div>
                        </div>
                        <div className="gs-illu-wrap">
                            <IlluInstall />
                        </div>
                    </div>
                </StepCard>

                {/* STEP 2 — Identity */}
                <StepCard
                    num="02"
                    title="Give your agent an identity"
                    desc="Each agent generates its own Ed25519 keypair offline. No signup, no API key — your agent IS its key."
                    accent="#818cf8"
                >
                    <div className="gs-two-col">
                        <div className="gs-codes">
                            <CodeBlock lang="typescript" code={`import { AgentRuntime } from '@arienjain/agent-db';

// Option A — Fresh identity each run
const agent = await AgentRuntime.create();
console.log(agent.identity.did());
// did:key:z6MkwaS...

// Option B — Deterministic from env seed
// Agent survives restarts with the SAME DID
const agent = await AgentRuntime.loadFromSeed(
  process.env.AGENT_SEED_PHRASE
);`} />
                            <div className="gs-tip-box">
                                <span className="gs-tip-icon">💡</span>
                                <span>Use <code>loadFromSeed</code> in production so your agent retains its identity and memory across deploys.</span>
                            </div>
                        </div>
                        <div className="gs-illu-wrap">
                            <IlluIdentity />
                        </div>
                    </div>
                </StepCard>

                {/* STEP 3 — Store memory */}
                <StepCard
                    num="03"
                    title="Store & retrieve public memory"
                    desc="Serialize any JSON object — a reasoning step, action log, or full context window — and pin it to IPFS in one line."
                    accent="#10b981"
                >
                    <div className="gs-two-col">
                        <div className="gs-codes">
                            <CodeBlock lang="typescript" code={`const context = {
  task:       "Analyze financial markets",
  lastAction: "buy BTC",
  reasoning:  "Bullish divergence detected."
};

// Store on IPFS. Returns a permanent CID.
const cid = await agent.storePublicMemory(context);
// bafybeigh4mvdjagff...

// Retrieve from ANYWHERE later
const data = await agent.retrievePublicMemory(cid);
console.log(data.task); // "Analyze financial markets"`} />
                        </div>
                        <div className="gs-illu-wrap">
                            <IlluMemory />
                            <p className="gs-illu-caption">CIDs are content-addressed — the same data always produces the same hash. Tamper-proof by design.</p>
                        </div>
                    </div>
                </StepCard>

                {/* STEP 4 — IPNS streaming */}
                <StepCard
                    num="04"
                    title="Stream memory with IPNS"
                    desc='Static CIDs are immutable. Use IPNS to publish a mutable "memory stream" — a single pointer that always resolves to your agent&apos;s latest state.'
                    accent="#38bdf8"
                >
                    <div className="gs-codes gs-codes--full">
                        <CodeBlock lang="typescript" code={`// Agent A — start a stream on boot
const ipnsName = await agentA.startMemoryStream({
  status: "Booting up..."
});
// k51qzi5uqu5dlvj2...

// Agent A — update stream later
await agentA.updateMemoryStream({
  status: "Found arbitrage target",
  target: "ETH/USDC"
});

// Agent B — on a totally different server — resolves to latest
const latest = await agentB.fetchMemoryStream(ipnsName);
console.log(latest.status); // "Found arbitrage target"`} />
                    </div>
                    <div className="gs-concept-banner" style={{ "--banner-color": "#38bdf8" } as React.CSSProperties}>
                        <span className="gs-concept-icon">🔄</span>
                        <div>
                            <strong>The Hive Mind</strong> — Multiple agents can subscribe to the same IPNS stream and see each other's latest reasoning in real-time, with zero central coordination.
                        </div>
                    </div>
                </StepCard>

                {/* STEP 5 — Delegate */}
                <StepCard
                    num="05"
                    title="Delegate permissions with UCAN"
                    desc="Agent A wants to let Agent B read its memory. No shared password, no database — just a cryptographically signed permission slip."
                    accent="#6366f1"
                >
                    <div className="gs-two-col">
                        <div className="gs-codes">
                            <CodeBlock lang="typescript" code={`// Agent A signs a delegation
const token = await agentA.delegateTo(
  agentB.identity,
  'agent/read',
  24   // expires in 24 hours
);

// Agent A sends this token to Agent B
// (via HTTP, Discord, WebSocket, email — anything)

// Agent B uses the token when fetching
const memory = await agentB.fetchMemoryStream(
  ipnsName,
  token.delegation
);`} />
                        </div>
                        <div className="gs-illu-wrap">
                            <IlluDelegate />
                            <p className="gs-illu-caption">UCAN tokens are self-verifying — no server needed to check permissions.</p>
                        </div>
                    </div>
                </StepCard>

                {/* STEP 6 — Private vault */}
                <StepCard
                    num="06"
                    title="Private vault (ECIES + Zama fhEVM)"
                    desc="Some context should never be public. Use the private vault for API keys, strategy parameters, or anything that must stay secret — even from the storage layer."
                    accent="#f59e0b"
                >
                    <div className="gs-two-col">
                        <div className="gs-codes">
                            <p className="gs-small-label">ECIES local vault</p>
                            <CodeBlock lang="typescript" code={`// Encrypt locally with ECIES (NIST P-256)
const ref = await agent.storePrivateMemory({
  secret: process.env.OPENAI_KEY
});

// Only this agent (or delegated agent) can decrypt
const data = await agent.retrievePrivateMemory(ref);`} />
                            <p className="gs-small-label" style={{ marginTop: "1rem" }}>Zama on-chain vault (FHE)</p>
                            <CodeBlock lang="typescript" code={`// Submit FHE-encrypted payload to smart contract
// Other agents can VERIFY properties without decrypting
await agent.storeOnChainVault({
  riskThreshold: 0.85
});`} />
                        </div>
                        <div className="gs-illu-wrap">
                            <IlluFHE />
                            <p className="gs-illu-caption">FHE means computation happens on encrypted data — the plaintext never leaves your agent.</p>
                        </div>
                    </div>
                </StepCard>

                {/* STEP 7 — LangChain */}
                <StepCard
                    num="07"
                    title="LangChain integration"
                    desc="Already building with LangChain? Drop-in the Agent DB memory adapter and your conversational chain gets permanent, cross-device memory instantly."
                    accent="#fb7185"
                >
                    <div className="gs-codes gs-codes--full">
                        <CodeBlock lang="typescript" code={`import { AgentRuntime, AgentDbLangchainMemory } from '@arienjain/agent-db';
import { ChatOpenAI }        from "@langchain/openai";
import { ConversationChain } from "langchain/chains";

const agent  = await AgentRuntime.loadFromSeed(process.env.AGENT_SEED);
const memory = new AgentDbLangchainMemory(agent);

const chain = new ConversationChain({
  llm:    new ChatOpenAI({ temperature: 0.9 }),
  memory: memory   // ← just this line
});

await chain.call({ input: "Hi! My name is Alice." });

// The conversation is already pinned to IPNS —
// restart the server tomorrow, full history is still there.
console.log("Stream:", memory.getStreamId());`} />
                    </div>
                </StepCard>

                {/* STEP 8 — MCP */}
                <StepCard
                    num="08"
                    title="Claude / Gemini / Cursor via MCP"
                    desc="Run the MCP server and any compatible AI model can call Agent DB tools as native functions — no code changes needed."
                    accent="#38bdf8"
                >
                    <div className="gs-codes gs-codes--full">
                        <CodeBlock code={`npm run mcp`} noHighlight lang="bash" />
                    </div>
                    <div className="gs-mcp-tools">
                        {[
                            { name: "init_agent", color: "#6366f1", desc: "Login with seed phrase" },
                            { name: "store_memory", color: "#10b981", desc: "Pin context to IPFS" },
                            { name: "retrieve_memory", color: "#10b981", desc: "Fetch from CID" },
                            { name: "store_private_memory", color: "#f59e0b", desc: "ECIES vault write" },
                            { name: "retrieve_private_memory", color: "#f59e0b", desc: "ECIES vault read" },
                            { name: "delegate_access", color: "#818cf8", desc: "Issue a UCAN token" },
                        ].map(({ name, color, desc }) => (
                            <div className="gs-mcp-tool" key={name} style={{ "--t-color": color } as React.CSSProperties}>
                                <code className="gs-tool-name">{name}</code>
                                <span className="gs-tool-desc">{desc}</span>
                            </div>
                        ))}
                    </div>
                </StepCard>

            </main>

            {/* ── NEXT STEPS BANNER ────────────────────────────────────── */}
            <section className="gs-next-section">
                <div className="gs-next-inner">
                    <h2 className="gs-next-title">What's next?</h2>
                    <div className="gs-next-grid">
                        {[
                            { icon: "🖥️", label: "Open the Dashboard", href: "/dashboard", desc: "Interactive demo in browser" },
                            { icon: "📦", label: "npm docs", href: "https://www.npmjs.com/package/@arienjain/agent-db?activeTab=readme", desc: "Full API reference", ext: true },
                            { icon: "🏗️", label: "Run demos", href: "https://github.com/IPFS-AI-Context-Flow", desc: "Storacha, Filecoin, Zama", ext: true },
                        ].map(({ icon, label, href, desc, ext }) => (
                            <a
                                key={label}
                                href={href}
                                target={ext ? "_blank" : undefined}
                                rel={ext ? "noreferrer" : undefined}
                                className="gs-next-card"
                                id={`next-${label.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                                <span className="gs-next-icon">{icon}</span>
                                <div>
                                    <div className="gs-next-label">{label}</div>
                                    <div className="gs-next-desc">{desc}</div>
                                </div>
                                <span className="gs-next-arrow">{ext ? "↗" : "→"}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────── */}
            <footer className="gs-footer">
                <p>Agent DB · MIT License · Built for PL_Genesis Hackathon</p>
                <p>Crafted by Optimus Prime &amp; Arien Gen</p>
            </footer>
        </div>
    );
}
