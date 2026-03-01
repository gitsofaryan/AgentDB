"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./landing.css";

/* ─── Animated background particles ─────────────────────────────────── */
function Particles() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    return (
        <div className="lp-particles" aria-hidden="true">
            {Array.from({ length: 40 }, (_, i) => (
                <span key={i} className="lp-particle" style={{
                    left: `${(((i * 2654435761) >>> 0) % 997) / 9.97}%`,
                    top: `${(((i * 1664525 + 1013904223) >>> 0) % 997) / 9.97}%`,
                    animationDelay: `${(i % 8)}s`,
                    animationDuration: `${6 + (i % 10)}s`,
                    width: `${2 + (i % 3)}px`,
                    height: `${2 + (i % 3)}px`,
                    opacity: 0.2 + (i % 5) * 0.08,
                }} />
            ))}
        </div>
    );
}

/* ─── Scroll-reveal hook ─────────────────────────────────────────────── */
function useReveal() {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setVisible(true); },
            { threshold: 0.15 }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    return { ref, visible };
}

/* ─── Section wrapper ────────────────────────────────────────────────── */
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    const { ref, visible } = useReveal();
    return (
        <div ref={ref} className={`lp-reveal ${visible ? "lp-reveal--in" : ""} ${className}`}>
            {children}
        </div>
    );
}

/* ─── SVG Illustrations ──────────────────────────────────────────────── */

/** Scene 1: amnesiac robot — memory leaking away */
function IllustrationAmnesia() {
    return (
        <svg className="lp-illustration" viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="An AI agent losing its memory">
            {/* glow backdrop */}
            <ellipse cx="180" cy="200" rx="120" ry="30" fill="rgba(99,102,241,0.08)" />
            {/* body */}
            <rect x="115" y="90" width="130" height="100" rx="20" fill="#13141f" stroke="#2a2b3d" strokeWidth="1.5" />
            {/* face screen */}
            <rect x="130" y="105" width="100" height="60" rx="12" fill="#0a0a14" stroke="#1e1f2e" strokeWidth="1" />
            {/* eyes — sad */}
            <circle cx="155" cy="133" r="8" fill="#1e1f2e" />
            <circle cx="205" cy="133" r="8" fill="#1e1f2e" />
            <circle cx="157" cy="135" r="4" fill="#6366f1" style={{ opacity: 0.6 }} />
            <circle cx="207" cy="135" r="4" fill="#6366f1" style={{ opacity: 0.6 }} />
            {/* sad mouth */}
            <path d="M165 152 Q180 144 195 152" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
            {/* antenna */}
            <line x1="180" y1="90" x2="180" y2="65" stroke="#2a2b3d" strokeWidth="2" />
            <circle cx="180" cy="60" r="6" fill="#6366f1" opacity="0.4" />
            {/* arms */}
            <rect x="75" y="105" width="40" height="14" rx="7" fill="#13141f" stroke="#2a2b3d" strokeWidth="1.5" />
            <rect x="245" y="105" width="40" height="14" rx="7" fill="#13141f" stroke="#2a2b3d" strokeWidth="1.5" />
            {/* legs */}
            <rect x="140" y="188" width="22" height="40" rx="8" fill="#13141f" stroke="#2a2b3d" strokeWidth="1.5" />
            <rect x="198" y="188" width="22" height="40" rx="8" fill="#13141f" stroke="#2a2b3d" strokeWidth="1.5" />
            {/* memory fragments drifting away */}
            <g className="lp-svg-drift" style={{ animationDelay: '0s' }}>
                <rect x="240" y="60" width="48" height="18" rx="5" fill="rgba(99,102,241,0.1)" stroke="rgba(99,102,241,0.3)" strokeWidth="1" />
                <text x="264" y="73" fontSize="8" fill="#6366f1" textAnchor="middle" fontFamily="monospace">memory[0]</text>
            </g>
            <g className="lp-svg-drift" style={{ animationDelay: '1.2s' }}>
                <rect x="280" y="90" width="52" height="18" rx="5" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
                <text x="306" y="103" fontSize="8" fill="#10b981" textAnchor="middle" fontFamily="monospace">context.log</text>
            </g>
            <g className="lp-svg-drift" style={{ animationDelay: '2.4s' }}>
                <rect x="255" y="120" width="44" height="18" rx="5" fill="rgba(245,158,11,0.08)" stroke="rgba(245,158,11,0.25)" strokeWidth="1" />
                <text x="277" y="133" fontSize="8" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">task.goal</text>
            </g>
            <g className="lp-svg-drift" style={{ animationDelay: '3.6s' }}>
                <rect x="60" y="55" width="50" height="18" rx="5" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.25)" strokeWidth="1" />
                <text x="85" y="68" fontSize="8" fill="#6366f1" textAnchor="middle" fontFamily="monospace">reasoning</text>
            </g>
            <g className="lp-svg-drift" style={{ animationDelay: '0.8s' }}>
                <rect x="30" y="95" width="56" height="18" rx="5" fill="rgba(16,185,129,0.08)" stroke="rgba(16,185,129,0.25)" strokeWidth="1" />
                <text x="58" y="108" fontSize="8" fill="#10b981" textAnchor="middle" fontFamily="monospace">last_action</text>
            </g>
            {/* question mark */}
            <text x="180" y="48" fontSize="22" fill="#a1a1aa" textAnchor="middle" opacity="0.4">?</text>
        </svg>
    );
}

/** Scene 2: Agent pinning a glowing orb (memory) to IPFS */
function IllustrationStore() {
    return (
        <svg className="lp-illustration" viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Agent storing memory to IPFS">
            <ellipse cx="180" cy="210" rx="130" ry="28" fill="rgba(16,185,129,0.06)" />
            {/* IPFS globe */}
            <circle cx="180" cy="100" r="68" fill="#0a0e1a" stroke="rgba(16,185,129,0.2)" strokeWidth="1.5" />
            {/* globe latitude lines */}
            {[0.35, 0.65, 0.85].map((y, i) => (
                <ellipse key={i} cx="180" cy={100 - 68 + y * 136} rx={Math.sqrt(68 * 68 - Math.pow(68 - y * 136, 2))} ry="10" stroke="rgba(16,185,129,0.1)" strokeWidth="1" fill="none" />
            ))}
            {/* globe meridians */}
            <ellipse cx="180" cy="100" rx="28" ry="68" stroke="rgba(16,185,129,0.1)" strokeWidth="1" fill="none" />
            <ellipse cx="180" cy="100" rx="60" ry="68" stroke="rgba(16,185,129,0.1)" strokeWidth="1" fill="none" />
            {/* IPFS label */}
            <text x="180" y="105" fontSize="12" fill="#10b981" textAnchor="middle" fontFamily="monospace" fontWeight="700">IPFS</text>
            <text x="180" y="120" fontSize="7" fill="#10b981" textAnchor="middle" fontFamily="monospace" opacity="0.6">Storacha Network</text>
            {/* glowing nodes on globe */}
            {[[155, 72], [210, 80], [200, 125], [155, 130], [180, 145]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="4" fill="#10b981" opacity="0.7" style={{ filter: 'drop-shadow(0 0 4px #10b981)' }} />
            ))}
            {/* connecting lines between nodes */}
            <line x1="155" y1="72" x2="210" y2="80" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <line x1="210" y1="80" x2="200" y2="125" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <line x1="200" y1="125" x2="155" y2="130" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <line x1="155" y1="130" x2="180" y2="145" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
            <line x1="155" y1="72" x2="155" y2="130" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
            {/* upload arrow */}
            <path d="M180 195 L180 172" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" className="lp-svg-pulse-line" />
            <polygon points="180,168 175,178 185,178" fill="#10b981" opacity="0.8" />
            {/* memory chip at bottom */}
            <rect x="150" y="200" width="60" height="30" rx="8" fill="#13141f" stroke="rgba(16,185,129,0.3)" strokeWidth="1.5" />
            <text x="180" y="220" fontSize="8" fill="#10b981" textAnchor="middle" fontFamily="monospace">CID: bafybei…</text>
            {/* CID ripple */}
            <circle cx="180" cy="100" r="75" stroke="rgba(16,185,129,0.1)" strokeWidth="1" className="lp-svg-ripple" />
            <circle cx="180" cy="100" r="82" stroke="rgba(16,185,129,0.06)" strokeWidth="1" className="lp-svg-ripple" style={{ animationDelay: '0.5s' }} />
        </svg>
    );
}

/** Scene 3: UCAN delegation — Agent A hands key to Agent B */
function IllustrationUCAN() {
    return (
        <svg className="lp-illustration" viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="UCAN delegation between two agents">
            <ellipse cx="180" cy="220" rx="130" ry="22" fill="rgba(99,102,241,0.06)" />
            {/* Agent A */}
            <rect x="28" y="90" width="80" height="70" rx="14" fill="#13141f" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
            <rect x="38" y="100" width="60" height="38" rx="8" fill="#0a0a14" stroke="#1e1f2e" strokeWidth="1" />
            <circle cx="55" cy="120" r="5" fill="#6366f1" opacity="0.8" />
            <circle cx="78" cy="120" r="5" fill="#6366f1" opacity="0.8" />
            <path d="M50 132 Q68 127 82 132" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
            <text x="68" y="174" fontSize="9" fill="#a1a1aa" textAnchor="middle" fontFamily="monospace">Agent A</text>
            <text x="68" y="186" fontSize="7" fill="#6366f1" textAnchor="middle" fontFamily="monospace">Master</text>
            {/* Agent B */}
            <rect x="252" y="90" width="80" height="70" rx="14" fill="#13141f" stroke="rgba(99,102,241,0.3)" strokeWidth="1.5" />
            <rect x="262" y="100" width="60" height="38" rx="8" fill="#0a0a14" stroke="#1e1f2e" strokeWidth="1" />
            <circle cx="279" cy="120" r="5" fill="#6366f1" opacity="0.6" />
            <circle cx="302" cy="120" r="5" fill="#6366f1" opacity="0.6" />
            <path d="M274 132 Q292 127 306 132" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4" />
            <text x="292" y="174" fontSize="9" fill="#a1a1aa" textAnchor="middle" fontFamily="monospace">Agent B</text>
            <text x="292" y="186" fontSize="7" fill="#6366f1" textAnchor="middle" fontFamily="monospace">Sub-Agent</text>
            {/* UCAN token floating in middle */}
            <rect x="130" y="100" width="100" height="60" rx="12" fill="#0d0f1c" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" className="lp-svg-float" />
            <text x="180" y="120" fontSize="8" fill="#6366f1" textAnchor="middle" fontFamily="monospace" fontWeight="700">UCAN Token</text>
            <text x="180" y="133" fontSize="6.5" fill="#a1a1aa" textAnchor="middle" fontFamily="monospace">cap: agent/read</text>
            <text x="180" y="144" fontSize="6.5" fill="#a1a1aa" textAnchor="middle" fontFamily="monospace">exp: 24h · signed</text>
            {/* lock icon */}
            <rect x="170" y="148" width="20" height="14" rx="3" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
            <path d="M175 148 Q175 144 180 144 Q185 144 185 148" stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" fill="none" />
            {/* arrows A→token and token→B */}
            <path d="M108 125 L128 125" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeDasharray="4 3" className="lp-svg-pulse-line" />
            <polygon points="128,121 122,125 128,129" fill="rgba(99,102,241,0.6)" />
            <path d="M232 125 L252 125" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5" strokeDasharray="4 3" className="lp-svg-pulse-line" style={{ animationDelay: '0.8s' }} />
            <polygon points="252,121 246,125 252,129" fill="rgba(99,102,241,0.6)" />
            {/* no server badge */}
            <rect x="148" y="56" width="64" height="22" rx="6" fill="rgba(245,158,11,0.1)" stroke="rgba(245,158,11,0.3)" strokeWidth="1" />
            <text x="180" y="71" fontSize="7.5" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">No central server</text>
        </svg>
    );
}

/** Scene 4: FHE encrypted vault */
function IllustrationFHE() {
    return (
        <svg className="lp-illustration" viewBox="0 0 360 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Fully Homomorphic Encryption vault">
            <ellipse cx="180" cy="220" rx="100" ry="20" fill="rgba(245,158,11,0.06)" />
            {/* vault door */}
            <rect x="95" y="55" width="170" height="155" rx="18" fill="#0d0e18" stroke="rgba(245,158,11,0.25)" strokeWidth="2" />
            {/* vault wheel */}
            <circle cx="180" cy="132" r="46" fill="none" stroke="rgba(245,158,11,0.15)" strokeWidth="3" />
            <circle cx="180" cy="132" r="36" fill="#0a0b14" stroke="rgba(245,158,11,0.2)" strokeWidth="2" />
            {/* spokes */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                return (
                    <line key={i}
                        x1={180 + 22 * Math.cos(rad)} y1={132 + 22 * Math.sin(rad)}
                        x2={180 + 36 * Math.cos(rad)} y2={132 + 36 * Math.sin(rad)}
                        stroke="rgba(245,158,11,0.3)" strokeWidth="2" />
                );
            })}
            {/* inner circle */}
            <circle cx="180" cy="132" r="18" fill="#13141f" stroke="rgba(245,158,11,0.4)" strokeWidth="1.5" />
            {/* lock hole */}
            <circle cx="180" cy="130" r="5" fill="rgba(245,158,11,0.15)" stroke="rgba(245,158,11,0.5)" strokeWidth="1.5" />
            <rect x="178" y="133" width="4" height="7" rx="1" fill="rgba(245,158,11,0.4)" />
            {/* FHE label */}
            <text x="180" y="207" fontSize="9" fill="#f59e0b" textAnchor="middle" fontFamily="monospace" fontWeight="700">Zama fhEVM</text>
            <text x="180" y="218" fontSize="7" fill="#a1a1aa" textAnchor="middle" fontFamily="monospace">Encrypted on-chain. Never decrypted.</text>
            {/* encrypted data streams */}
            {[
                { x: 105, y: 75, label: "0xAF3E…" },
                { x: 230, y: 75, label: "0x91C2…" },
                { x: 105, y: 175, label: "FHE[ctx]" },
                { x: 230, y: 175, label: "FHE[key]" },
            ].map(({ x, y, label }, i) => (
                <g key={i}>
                    <rect x={x - 28} y={y - 10} width="56" height="20" rx="5" fill="rgba(245,158,11,0.06)" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
                    <text x={x} y={y + 4} fontSize="7" fill="#f59e0b" textAnchor="middle" fontFamily="monospace">{label}</text>
                </g>
            ))}
            {/* glow on vault */}
            <rect x="95" y="55" width="170" height="155" rx="18" fill="none" stroke="rgba(245,158,11,0.08)" strokeWidth="12" style={{ filter: 'blur(2px)' }} />
        </svg>
    );
}

/* ─── Typewriter effect ──────────────────────────────────────────────── */
function Typewriter({ texts, className = "" }: { texts: string[]; className?: string }) {
    const [idx, setIdx] = useState(0);
    const [displayed, setDisplayed] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const target = texts[idx];
        if (done) return;

        if (!deleting && displayed.length < target.length) {
            const t = setTimeout(() => setDisplayed(target.slice(0, displayed.length + 1)), 60);
            return () => clearTimeout(t);
        }
        if (!deleting && displayed.length === target.length) {
            if (idx === texts.length - 1) { setDone(true); return; }
            const t = setTimeout(() => setDeleting(true), 1800);
            return () => clearTimeout(t);
        }
        if (deleting && displayed.length > 0) {
            const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 35);
            return () => clearTimeout(t);
        }
        if (deleting && displayed.length === 0) {
            setDeleting(false);
            setIdx((i) => (i + 1) % texts.length);
        }
    }, [displayed, deleting, idx, texts, done]);

    return (
        <span className={className}>
            {displayed}
            <span className="lp-cursor" aria-hidden="true">|</span>
        </span>
    );
}

/* ─── Tech Stack pills ───────────────────────────────────────────────── */
const STACK = [
    { name: "Storacha", color: "#10b981", desc: "Decentralized IPFS pinning" },
    { name: "IPNS", color: "#6366f1", desc: "Mutable memory streams" },
    { name: "UCAN", color: "#818cf8", desc: "Auth without servers" },
    { name: "Zama fhEVM", color: "#f59e0b", desc: "Encrypted on-chain vault" },
    { name: "Lit Protocol", color: "#fb7185", desc: "Programmable wallet logic" },
    { name: "MCP", color: "#38bdf8", desc: "Claude / Gemini native tools" },
];

/* ─── Main component ─────────────────────────────────────────────────── */
export default function LandingPage() {
    const [heroLoaded, setHeroLoaded] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setHeroLoaded(true), 100);
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="lp-root">
            <Particles />

            {/* ── STICKY NAV ─────────────────────────────────────── */}
            <nav className="lp-nav" aria-label="Site navigation">
                <div className="lp-nav-inner">
                    <span className="lp-nav-logo">AGENT DB</span>
                    <div className="lp-nav-links">
                        <Link href="/get-started" className="lp-nav-link" id="nav-get-started">Get Started</Link>
                        <a href="https://www.npmjs.com/package/@arienjain/agent-db" target="_blank" rel="noreferrer" className="lp-nav-link" id="nav-npm">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: "0.25rem", verticalAlign: "middle" }}><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474C23.214 24 24 23.214 24 22.237V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z" /></svg>
                            npm
                        </a>
                        <Link href="/dashboard" className="lp-nav-cta" id="nav-dashboard">Dashboard →</Link>
                    </div>
                </div>
            </nav>

            {/* ── HERO ───────────────────────────────────────────────────── */}
            <section className="lp-hero" aria-label="Hero section">
                <div className={`lp-hero-inner ${heroLoaded ? "lp-hero-inner--in" : ""}`}>
                    {/* badge */}
                    <div className="lp-badge">
                        <span className="lp-badge-dot" />
                        Decentralized Memory · IPFS · UCAN · FHE
                    </div>

                    <h1 className="lp-hero-title">
                        Your AI agent is{" "}
                        <Typewriter
                            texts={["forgetting everything.", "starting over. Again.", "losing its mind.", "suffering amnesia."]}
                            className="lp-highlight"
                        />
                    </h1>

                    <p className="lp-hero-sub">
                        Every time you restart your agent, its entire reasoning — goals, logs,
                        relationships, decisions — evaporates.&nbsp;
                        <strong>Agent DB</strong> fixes that, permanently and without a central server.
                    </p>

                    <div className="lp-hero-ctas">
                        <Link href="/dashboard" className="lp-btn lp-btn--primary" id="cta-enter-vault">
                            Enter the Vault →
                        </Link>
                        <Link href="/get-started" className="lp-btn lp-btn--secondary" id="cta-get-started">
                            Get Started
                        </Link>
                        <a
                            href="https://github.com/IPFS-AI-Context-Flow"
                            target="_blank"
                            rel="noreferrer"
                            className="lp-btn lp-btn--ghost"
                            id="cta-github"
                        >
                            GitHub
                        </a>
                    </div>
                </div>

                {/* hero visual — animated memory orb */}
                <div className={`lp-orb-wrap ${heroLoaded ? "lp-orb-wrap--in" : ""}`} aria-hidden="true">
                    <div className="lp-orb">
                        <div className="lp-orb-ring lp-orb-ring--1" />
                        <div className="lp-orb-ring lp-orb-ring--2" />
                        <div className="lp-orb-ring lp-orb-ring--3" />
                        <div className="lp-orb-core">
                            <span>🧠</span>
                        </div>
                        {/* floating CID tags */}
                        {[
                            { label: "did:key:z6Mk…", top: "12%", left: "68%", color: "#6366f1", delay: "0s" },
                            { label: "CID: bafyb…", top: "38%", left: "78%", color: "#10b981", delay: "0.6s" },
                            { label: "UCAN✓", top: "70%", left: "65%", color: "#818cf8", delay: "1.2s" },
                            { label: "FHE[𝕔]", top: "75%", left: "15%", color: "#f59e0b", delay: "1.8s" },
                            { label: "IPNS→", top: "40%", left: "8%", color: "#38bdf8", delay: "0.4s" },
                            { label: "agent/read", top: "10%", left: "15%", color: "#fb7185", delay: "1s" },
                        ].map(({ label, top, left, color, delay }, i) => (
                            <div
                                key={i}
                                className="lp-orb-tag"
                                style={{ top, left, color, borderColor: color, animationDelay: delay }}
                            >
                                {label}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PROBLEM ───────────────────────────────────────────────── */}
            <section className="lp-section" id="problem">
                <Reveal className="lp-section-header">
                    <span className="lp-section-eyebrow">Chapter 1</span>
                    <h2 className="lp-section-title">The AI Amnesia Problem</h2>
                    <p className="lp-section-body">
                        You build a sophisticated AI agent. It learns, it reasons, it forms a plan.
                        Then the server restarts — or you switch computers — and it&#39;s gone.
                        Back to zero. Every. Single. Time.
                    </p>
                </Reveal>

                <div className="lp-two-col lp-two-col--reverse">
                    <Reveal className="lp-illustration-wrap">
                        <IllustrationAmnesia />
                    </Reveal>
                    <Reveal className="lp-story-points">
                        {[
                            {
                                icon: "💀",
                                title: "Context dies on restart",
                                body: "Your agent's reasoning window lives in RAM. Process ends — memory ends.",
                            },
                            {
                                icon: "🔒",
                                title: "No portability between platforms",
                                body: "What your LangChain bot learned on Server A means nothing to your Discord bot on Server B.",
                            },
                            {
                                icon: "🕳️",
                                title: "No verifiable history",
                                body: "\"We have logs\" is not the same as cryptographically proving what the agent knew and when.",
                            },
                        ].map(({ icon, title, body }) => (
                            <div className="lp-story-point" key={title}>
                                <span className="lp-point-icon">{icon}</span>
                                <div>
                                    <h3 className="lp-point-title">{title}</h3>
                                    <p className="lp-point-body">{body}</p>
                                </div>
                            </div>
                        ))}
                    </Reveal>
                </div>
            </section>

            {/* ── SOLUTION ──────────────────────────────────────────────── */}
            <section className="lp-section lp-section--accent" id="solution">
                <Reveal className="lp-section-header">
                    <span className="lp-section-eyebrow">Chapter 2</span>
                    <h2 className="lp-section-title">Introducing Agent DB</h2>
                    <p className="lp-section-body">
                        A decentralized memory engine that lets any AI agent persist its context to
                        the open web — encrypted, verifiable, and permission-controlled.
                        No database to maintain. No central server to trust.
                    </p>
                </Reveal>

                <Reveal className="lp-solve-grid">
                    {[
                        {
                            color: "#10b981",
                            icon: "☁️",
                            title: "Pin to IPFS",
                            body: "Your agent's context becomes an immutable CID on Storacha's decentralized storage layer. Retrieve it from anywhere on the planet.",
                        },
                        {
                            color: "#6366f1",
                            icon: "🔑",
                            title: "Own its identity",
                            body: "Every agent generates its own Ed25519 DID. No accounts, no passwords — just cryptographic keys your agent controls.",
                        },
                        {
                            color: "#f59e0b",
                            icon: "🛡️",
                            title: "Encrypt privately",
                            body: "Sensitive reasoning goes into a Zama fhEVM vault encrypted end-to-end. Even the blockchain can't read it.",
                        },
                        {
                            color: "#818cf8",
                            icon: "🤝",
                            title: "Delegate safely",
                            body: "Use UCAN tokens to grant other agents read access for a limited time — cryptographically signed, no middleman required.",
                        },
                    ].map(({ color, icon, title, body }) => (
                        <div className="lp-solve-card" key={title} style={{ "--card-accent": color } as React.CSSProperties}>
                            <div className="lp-solve-icon">{icon}</div>
                            <h3 className="lp-solve-title">{title}</h3>
                            <p className="lp-solve-body">{body}</p>
                        </div>
                    ))}
                </Reveal>
            </section>

            {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
            <section className="lp-section" id="how-it-works">
                <Reveal className="lp-section-header">
                    <span className="lp-section-eyebrow">Chapter 3</span>
                    <h2 className="lp-section-title">Three scenes. One system.</h2>
                    <p className="lp-section-body">
                        Here&#39;s what actually happens when your agent uses Agent DB.
                    </p>
                </Reveal>

                {/* Step 1 */}
                <div className="lp-how-step">
                    <Reveal className="lp-illustration-wrap">
                        <IllustrationStore />
                    </Reveal>
                    <Reveal className="lp-how-copy">
                        <span className="lp-step-num">01</span>
                        <h3 className="lp-how-title">Agent thinks → Memory pinned</h3>
                        <p className="lp-how-body">
                            Each reasoning step your agent takes gets serialized and uploaded to
                            Storacha's IPFS network. What comes back is a content address (CID) —
                            a permanent, tamper-proof fingerprint of that exact thought.
                            Lose the server. The CID survives.
                        </p>
                        <code className="lp-code-pill">const cid = await agent.storePublicMemory(context);</code>
                    </Reveal>
                </div>

                {/* Step 2 */}
                <div className="lp-how-step lp-how-step--reverse">
                    <Reveal className="lp-illustration-wrap">
                        <IllustrationUCAN />
                    </Reveal>
                    <Reveal className="lp-how-copy">
                        <span className="lp-step-num">02</span>
                        <h3 className="lp-how-title">Permission without passwords</h3>
                        <p className="lp-how-body">
                            Need Agent B to read Agent A's memory? Instead of a shared database or
                            API key, Agent A signs a UCAN token — a cryptographic &#34;permission slip&#34;
                            that expires in 24 hours and is valid nowhere else. No central auth server.
                            No &#34;forgot password&#34; nightmare.
                        </p>
                        <code className="lp-code-pill">const token = await agentA.delegateTo(agentB.identity, 'agent/read');</code>
                    </Reveal>
                </div>

                {/* Step 3 */}
                <div className="lp-how-step">
                    <Reveal className="lp-illustration-wrap">
                        <IllustrationFHE />
                    </Reveal>
                    <Reveal className="lp-how-copy">
                        <span className="lp-step-num">03</span>
                        <h3 className="lp-how-title">Secrets stay secret — even on-chain</h3>
                        <p className="lp-how-body">
                            Some context should never be public. Agent DB's private vault uses
                            Zama's Fully Homomorphic Encryption: the data is stored encrypted
                            on-chain, and other agents can verify properties of the data
                            without ever seeing the plaintext. Sovereignty, not secrecy theater.
                        </p>
                        <code className="lp-code-pill">await agent.storePrivateMemory({"{"} secret: apiKey {"}"});</code>
                    </Reveal>
                </div>
            </section>

            {/* ── TECH STACK ───────────────────────────────────────────── */}
            <section className="lp-section lp-section--dark" id="stack">
                <Reveal className="lp-section-header">
                    <span className="lp-section-eyebrow">The Stack</span>
                    <h2 className="lp-section-title">Built on open protocols</h2>
                    <p className="lp-section-body">
                        No proprietary lock-in. Every layer is an open standard you can verify,
                        fork, or replace.
                    </p>
                </Reveal>
                <Reveal className="lp-stack-pills">
                    {STACK.map(({ name, color, desc }) => (
                        <div className="lp-stack-pill" key={name} style={{ "--pill-color": color } as React.CSSProperties}>
                            <span className="lp-pill-dot" style={{ background: color }} />
                            <div>
                                <div className="lp-pill-name">{name}</div>
                                <div className="lp-pill-desc">{desc}</div>
                            </div>
                        </div>
                    ))}
                </Reveal>
            </section>

            {/* ── MCP CALLOUT ──────────────────────────────────────────── */}
            <section className="lp-section" id="mcp">
                <Reveal className="lp-mcp-card">
                    <div className="lp-mcp-glow" aria-hidden="true" />
                    <span className="lp-mcp-badge">NEW · Model Context Protocol</span>
                    <h2 className="lp-mcp-title">Claude, Gemini, and Cursor can use it natively</h2>
                    <p className="lp-mcp-body">
                        Agent DB exposes an MCP server. Any compatible AI — Claude, Gemini, Cursor —
                        can call <code>store_memory</code>, <code>delegate_access</code>, and
                        <code> retrieve_memory</code> as native tools. Your AI agent gets persistent
                        memory with a single config line.
                    </p>
                    <div className="lp-mcp-terminal" role="img" aria-label="MCP terminal command">
                        <span className="lp-term-prompt">$</span>
                        <span className="lp-term-cmd"> npm run mcp</span>
                        <br />
                        <span className="lp-term-out">✓ MCP server listening on stdio</span>
                        <br />
                        <span className="lp-term-out">✓ Tools registered: init_agent · store_memory · delegate_access</span>
                    </div>
                </Reveal>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────── */}
            <section className="lp-cta-section" id="cta">
                <Reveal className="lp-cta-inner">
                    <div className="lp-cta-glow" aria-hidden="true" />
                    <h2 className="lp-cta-title">Ready to give your agent a permanent memory?</h2>
                    <p className="lp-cta-sub">
                        Open the live dashboard to upload, delegate, and encrypt — right in your browser.
                    </p>
                    <Link href="/dashboard" className="lp-btn lp-btn--primary lp-btn--large" id="cta-dashboard">
                        Open Agent Vault →
                    </Link>
                    <p className="lp-cta-note">No account needed · Open source · MIT Licensed</p>
                </Reveal>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────── */}
            <footer className="lp-footer">
                <div className="lp-footer-logo">AGENT DB</div>
                <p className="lp-footer-copy">
                    Built for PL_Genesis Hackathon · Powered by Storacha, UCAN, Lit Protocol &amp; Zama fhEVM
                </p>
                <p className="lp-footer-sig">Crafted by Optimus Prime & Arien Gen</p>
            </footer>
        </div>
    );
}
