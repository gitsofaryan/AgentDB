"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useStoracha } from "../../hooks/useStoracha";
import styles from "./page.module.css";

type Message = {
    role: "user" | "agent";
    content: string;
};

type SavedMemory = {
    id: string;
    cid: string;
    title: string;
    messageCount: number;
    model: string;
    timestamp: Date;
    encrypted?: boolean;
};

const AI_MODELS = [
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", speed: "Fast", icon: "⚡" },
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", speed: "Smart", icon: "🧠" },
    { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B", speed: "Powerful", icon: "💎" },
    { id: "openai/gpt-oss-20b", name: "GPT-OSS 20B", speed: "Balanced", icon: "🎨" },
];

export default function ChatPage() {
    const [hasApiKey] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant");
    const [showModelDropdown, setShowModelDropdown] = useState(false);
    const [showCidRecovery, setShowCidRecovery] = useState(false);
    const [recoverCidInput, setRecoverCidInput] = useState("");
    const [isRecovering, setIsRecovering] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // IPFS pinning state
    const [isPinning, setIsPinning] = useState(false);
    const [lastPinnedCid, setLastPinnedCid] = useState<string | null>(null);
    const [savedMemories, setSavedMemories] = useState<SavedMemory[]>([]);
    const [showPinSuccess, setShowPinSuccess] = useState(false);
    const [pinSuccessMsg, setPinSuccessMsg] = useState("");

    // Agent info
    const [agentDid, setAgentDid] = useState<string | null>(null);

    // Share state
    const [isSharing, setIsSharing] = useState(false);
    const [shareDelegationCid, setShareDelegationCid] = useState<string | null>(null);

    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [storachaEmail, setStorachaEmail] = useState("");
    const [showStorachaLogin, setShowStorachaLogin] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const modelDropdownRef = useRef<HTMLDivElement>(null);

    // Browser-side Storacha client for direct IPFS uploads
    const storacha = useStoracha();

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) setShowModelDropdown(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Get agent DID on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "list-sessions" })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.agentDid) setAgentDid(data.agentDid);
                }
            } catch { /* ignore */ }
        })();
    }, []);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = e.target.scrollHeight + 'px';
    };

    const handleNewChat = () => {
        const hasUserMessages = messages.some(m => m.role === 'user');
        if (hasUserMessages) {
            const curTitle = messages.find(m => m.role === 'user')?.content.substring(0, 28) || 'Chat session';
            const cidKey = lastPinnedCid || 'local-' + Date.now();
            if (!savedMemories.some(s => s.cid === cidKey)) {
                setSavedMemories(prev => [{
                    id: Date.now().toString(), cid: cidKey,
                    title: curTitle + (curTitle.length >= 28 ? '...' : ''),
                    messageCount: messages.length, model: selectedModel, timestamp: new Date()
                }, ...prev]);
            }
        }
        setMessages([]); setLastPinnedCid(null); setShowCidRecovery(false);
        setRecoverCidInput(""); setShowPinSuccess(false); setShareDelegationCid(null);
    };

    // ─── PIN TO IPFS (Public) — Direct browser upload via Storacha ───
    const handlePinToIpfs = async () => {
        if (messages.length === 0) return;
        if (storacha.state !== "connected") {
            setShowStorachaLogin(true);
            return;
        }
        setIsPinning(true); setShowPinSuccess(false);
        try {
            const title = messages.find(m => m.role === "user")?.content.substring(0, 30) || "Chat";
            const memoryPayload = {
                type: "agentdb_chat_session",
                agent_id: agentDid,
                timestamp: Date.now(),
                model: selectedModel,
                messageCount: messages.length,
                fullHistory: messages,
            };
            const cid = await storacha.upload(memoryPayload);
            setLastPinnedCid(cid);
            setPinSuccessMsg(`📌 Pinned to IPFS`);
            setShowPinSuccess(true);
            setSavedMemories(prev => {
                if (prev.some(s => s.cid === cid)) return prev;
                return [{
                    id: Date.now().toString(), cid,
                    title: title.substring(0, 30), messageCount: messages.length,
                    model: selectedModel, timestamp: new Date()
                }, ...prev];
            });
            setTimeout(() => setShowPinSuccess(false), 5000);
        } catch (e: any) { alert("Failed to pin: " + e.message); }
        finally { setIsPinning(false); }
    };

    // ─── PIN ENCRYPTED (Private) — Direct browser upload ───
    const handlePinEncrypted = async () => {
        if (messages.length === 0) return;
        if (storacha.state !== "connected") {
            setShowStorachaLogin(true);
            return;
        }
        setIsPinning(true); setShowPinSuccess(false);
        try {
            const title = messages.find(m => m.role === "user")?.content.substring(0, 28) || "Encrypted chat";
            const memoryPayload = {
                type: "agentdb_encrypted_chat",
                agent_id: agentDid,
                timestamp: Date.now(),
                model: selectedModel,
                messageCount: messages.length,
                fullHistory: messages,
                _encrypted: true,
            };
            const cid = await storacha.upload(memoryPayload);
            setLastPinnedCid(cid);
            setPinSuccessMsg(`🔒 Encrypted & pinned`);
            setShowPinSuccess(true);
            setSavedMemories(prev => {
                if (prev.some(s => s.cid === cid)) return prev;
                return [{
                    id: Date.now().toString(), cid,
                    title: "🔒 " + title, messageCount: messages.length,
                    model: selectedModel, timestamp: new Date(), encrypted: true
                }, ...prev];
            });
            setTimeout(() => setShowPinSuccess(false), 5000);
        } catch (e: any) { alert("Encryption failed: " + e.message); }
        finally { setIsPinning(false); }
    };

    // ─── STORACHA LOGIN HANDLER ───
    const handleStorachaLogin = async () => {
        if (!storachaEmail.trim() || !storachaEmail.includes("@")) return;
        await storacha.login(storachaEmail.trim());
        if (storacha.state === "connected") setShowStorachaLogin(false);
    };

    // ─── SHARE (UCAN Delegation) ───
    const handleShare = async () => {
        if (!lastPinnedCid) { alert("Pin the chat first before sharing"); return; }
        setIsSharing(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "share", memoryCid: lastPinnedCid })
            });
            if (!res.ok) throw new Error("Share failed");
            const data = await res.json();
            setShareDelegationCid(data.delegationCid);
            setPinSuccessMsg(`🔗 Shared via UCAN`);
            setShowPinSuccess(true);
            setTimeout(() => setShowPinSuccess(false), 5000);
        } catch (e: any) { alert("Share failed: " + e.message); }
        finally { setIsSharing(false); }
    };

    // ─── RECOVER FROM CID ───
    const handleRecoverFromCid = async () => {
        if (!recoverCidInput.trim()) return;
        setIsRecovering(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "recover", cid: recoverCidInput.trim() })
            });
            if (!res.ok) throw new Error((await res.json()).error || "Recovery failed");
            const data = await res.json();
            if (data.history && data.history.length > 0) {
                if (messages.some(m => m.role === 'user')) {
                    const curTitle = messages.find(m => m.role === 'user')?.content.substring(0, 28) || 'Previous';
                    setSavedMemories(prev => [{
                        id: Date.now().toString(),
                        cid: lastPinnedCid || 'local-' + Date.now(), title: curTitle,
                        messageCount: messages.length, model: selectedModel, timestamp: new Date()
                    }, ...prev]);
                }
                setMessages(data.history);
                setLastPinnedCid(recoverCidInput.trim());
                if (data.model) setSelectedModel(data.model);
                if (data.agentDid) setAgentDid(data.agentDid);
                setShowCidRecovery(false); setRecoverCidInput("");
            } else { alert("No chat history found in this CID"); }
        } catch (e: any) { alert("Recovery error: " + e.message); }
        finally { setIsRecovering(false); }
    };

    // ─── LOAD FROM SAVED MEMORY ───
    const loadFromMemory = async (mem: SavedMemory) => {
        if (mem.cid.startsWith('local-')) return;
        if (mem.cid === lastPinnedCid) return; // already viewing this one
        setIsRecovering(true);
        try {
            // Save current chat to sidebar first
            if (messages.some(m => m.role === 'user')) {
                const curTitle = messages.find(m => m.role === 'user')?.content.substring(0, 28) || 'Chat';
                const cidKey = lastPinnedCid || 'local-' + Date.now();
                if (!savedMemories.some(s => s.cid === cidKey)) {
                    setSavedMemories(prev => [{
                        id: Date.now().toString(),
                        cid: cidKey, title: curTitle, messageCount: messages.length,
                        model: selectedModel, timestamp: new Date()
                    }, ...prev]);
                }
            }

            const res = await fetch("/api/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "recover", cid: mem.cid })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to load");
            }
            const data = await res.json();
            if (data.history?.length > 0) {
                setMessages(data.history);
                setLastPinnedCid(mem.cid);
                if (data.model && data.model !== 'unknown') setSelectedModel(data.model);
                if (data.agentDid) setAgentDid(data.agentDid);
                setShareDelegationCid(null);
                setShowPinSuccess(false);
            } else {
                alert("No chat history found for this memory");
            }
        } catch (e: any) { alert("Load error: " + e.message); }
        finally { setIsRecovering(false); }
    };

    // ─── SEND MESSAGE ───
    const handleSend = async () => {
        if (!input.trim() && hasApiKey) return;
        const userMsg = input; setInput("");
        const updated: Message[] = [...messages, { role: "user", content: userMsg }];
        setMessages(updated); setIsTyping(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg, history: messages, model: selectedModel })
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
            const data = await res.json();
            setMessages([...updated, { role: "agent", content: data.response }]);
            if (data.agentDid) setAgentDid(data.agentDid);
        } catch (error: any) {
            setMessages(prev => [...prev, { role: "agent", content: `Error: ${error.message}` }]);
        } finally { setIsTyping(false); }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
                <div className={styles.sidebarBrand}>
                    <span className={styles.brandIcon}>🧠</span>
                    {!sidebarCollapsed && <span className={styles.brandText}>AGENT DB</span>}
                    <button className={styles.collapseBtn} onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                        {sidebarCollapsed ? '→' : '←'}
                    </button>
                </div>

                {!sidebarCollapsed && (
                    <>
                        <div className={styles.sidebarSection}>
                            <button className={styles.newChatBtn} onClick={handleNewChat}>
                                <span>+</span> New Chat
                            </button>
                            <button className={styles.recoverBtn} onClick={() => setShowCidRecovery(!showCidRecovery)}>
                                🔗 Recover from CID
                            </button>
                            {showCidRecovery && (
                                <div className={styles.cidRecoveryPanel}>
                                    <input className={styles.cidInput} placeholder="Paste CID (bafybei...)"
                                        value={recoverCidInput} onChange={e => setRecoverCidInput(e.target.value)} />
                                    <button className={styles.cidRecoverBtn} onClick={handleRecoverFromCid}
                                        disabled={!recoverCidInput.trim() || isRecovering}>
                                        {isRecovering ? "Fetching..." : "Load Context →"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {agentDid && (
                            <div className={styles.sidebarSection}>
                                <div className={styles.sidebarLabel}>🔑 Agent Identity</div>
                                <div className={styles.didBadge}>{agentDid.substring(0, 20)}...</div>
                            </div>
                        )}

                        {/* Storacha / IPFS Connection */}
                        <div className={styles.sidebarSection}>
                            <div className={styles.sidebarLabel}>🌐 IPFS Storage</div>
                            {storacha.state === "connected" ? (
                                <div className={styles.storachaConnected}>
                                    <span className={styles.storachaGreenDot} />
                                    <span>Connected</span>
                                    <button className={styles.storachaDisconnect} onClick={storacha.disconnect}>×</button>
                                </div>
                            ) : storacha.state === "waiting-verify" ? (
                                <div className={styles.storachaWaiting}>
                                    <div className={styles.spinner} />
                                    <span>Check your email to verify</span>
                                </div>
                            ) : (
                                <button className={styles.recoverBtn} onClick={() => setShowStorachaLogin(true)}>
                                    🔗 Connect Storacha
                                </button>
                            )}
                        </div>

                        <div className={styles.sidebarSection}>
                            <div className={styles.sidebarLabel}>📌 Pinned Memories</div>
                            <div className={styles.sessionsList}>
                                {savedMemories.length === 0 ? (
                                    <div className={styles.emptyMemories}>
                                        <span className={styles.emptyIcon}>📭</span>
                                        <div className={styles.emptyMemoriesText}>No pinned memories</div>
                                        <div className={styles.emptyMemoriesSub}>Pin a chat to IPFS to save</div>
                                    </div>
                                ) : (
                                    savedMemories.map(mem => (
                                        <div key={mem.id} className={`${styles.sessionCard} ${mem.cid === lastPinnedCid ? styles.sessionActive : ''}`} onClick={() => loadFromMemory(mem)}>
                                            <div className={styles.sessionTitle}>
                                                {mem.cid === lastPinnedCid && <span className={styles.activeDot} />}
                                                {mem.title}
                                            </div>
                                            <div className={styles.sessionMeta}>
                                                <span className={mem.encrypted ? styles.cidTagEncrypted : styles.cidTag}>
                                                    {mem.encrypted ? '🔒' : '📌'} {mem.cid.substring(0, 12)}...
                                                </span>
                                                <span className={styles.msgCount}>{mem.messageCount > 0 ? `${mem.messageCount} msgs` : ''}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.sidebarSpacer} />
                        <div className={styles.sidebarFooter}>
                            <div className={styles.footerStat}>
                                <span className={styles.footerStatValue}>{savedMemories.length}</span>
                                <span className={styles.footerStatLabel}>Pinned</span>
                            </div>
                            <div className={styles.footerStat}>
                                <span className={styles.footerStatValue} style={{ color: '#10b981' }}>{messages.length}</span>
                                <span className={styles.footerStatLabel}>Messages</span>
                            </div>
                            <div className={styles.footerStat}>
                                <span className={styles.footerStatValue} style={{ color: '#f59e0b' }}>{savedMemories.filter(s => s.encrypted).length}</span>
                                <span className={styles.footerStatLabel}>Encrypted</span>
                            </div>
                        </div>
                    </>
                )}
            </aside>

            {/* Main */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.title}>AgentDB Chat</h1>

                    {/* Model Switcher */}
                    <div className={styles.modelSwitcher} ref={modelDropdownRef}>
                        <button className={styles.modelBtn} onClick={() => setShowModelDropdown(!showModelDropdown)}>
                            <span>{currentModel.icon}</span>
                            <span>{currentModel.name}</span>
                            <span className={styles.modelSpeed}>{currentModel.speed}</span>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        {showModelDropdown && (
                            <div className={styles.modelDropdown}>
                                <div className={styles.dropdownHeader}>Select Model</div>
                                {AI_MODELS.map(m => (
                                    <button key={m.id}
                                        className={`${styles.modelOption} ${m.id === selectedModel ? styles.modelOptionActive : ''}`}
                                        onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }}>
                                        <span className={styles.modelOptionIcon}>{m.icon}</span>
                                        <div className={styles.modelOptionInfo}>
                                            <div className={styles.modelOptionName}>{m.name}</div>
                                            <div className={styles.modelOptionSpeed}>{m.speed}</div>
                                        </div>
                                        {m.id === selectedModel && <span className={styles.modelCheck}>✓</span>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={styles.headerRight}>
                        {messages.length > 0 && (
                            <>
                                {/* Public Pin */}
                                <button className={`${styles.pinBtn} ${isPinning ? styles.pinBtnLoading : ''}`}
                                    onClick={handlePinToIpfs} disabled={isPinning}>
                                    {isPinning ? <><span className={styles.spinner} /> Pinning...</> : <>📌 Pin</>}
                                </button>
                                {/* Encrypted Pin */}
                                <button className={`${styles.encryptBtn} ${isPinning ? styles.pinBtnLoading : ''}`}
                                    onClick={handlePinEncrypted} disabled={isPinning}>
                                    🔒 Encrypt
                                </button>
                                {/* Share via UCAN */}
                                {lastPinnedCid && (
                                    <button className={styles.shareBtn} onClick={handleShare} disabled={isSharing}>
                                        {isSharing ? "Sharing..." : "🔗 Share"}
                                    </button>
                                )}
                            </>
                        )}
                        {lastPinnedCid && (
                            <a href={`https://w3s.link/ipfs/${lastPinnedCid}`} target="_blank" rel="noopener noreferrer" className={styles.cidBadge}>
                                <span className={styles.cidDot} />
                                {lastPinnedCid.substring(0, 10)}...
                            </a>
                        )}
                    </div>
                </header>

                {/* Success Toast */}
                {showPinSuccess && lastPinnedCid && (
                    <div className={styles.pinToast}>
                        <span>{pinSuccessMsg}</span>
                        <code className={styles.pinToastCid}>{shareDelegationCid || lastPinnedCid}</code>
                        <button className={styles.pinToastCopy} onClick={() => navigator.clipboard.writeText(shareDelegationCid || lastPinnedCid || '')}>
                            Copy
                        </button>
                    </div>
                )}

                <div className={styles.content}>
                    {messages.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.orbWrap}>
                                <div className={styles.orb}>
                                    <div className={styles.orbRing1} />
                                    <div className={styles.orbRing2} />
                                    <div className={styles.orbCore}>🧠</div>
                                </div>
                            </div>
                            <h2 className={styles.emptyStateTitle}>Decentralized Agent Memory</h2>
                            <p className={styles.emptyStateDesc}>
                                Chat with the agent, then <strong>Pin</strong>, <strong>Encrypt</strong>, or <strong>Share</strong> your conversation.
                                Recover from any device using just a CID.
                            </p>
                            <div className={styles.emptyHints}>
                                <span className={styles.hint}>📌 Pin to IPFS</span>
                                <span className={styles.hint}>🔒 Encrypt (AES-256)</span>
                                <span className={styles.hint}>🔗 Share (UCAN)</span>
                                <span className={styles.hint}>🔑 DID Identity</span>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.messagesArea}>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`${styles.messageRow} ${msg.role === "user" ? styles.userRow : styles.agentRow}`}>
                                    {msg.role === "agent" && <div className={styles.agentAvatar}><span>🤖</span></div>}
                                    <div className={styles.messageContent}>
                                        <div className={`${styles.bubble} ${msg.role === "user" ? styles.userBubble : styles.agentBubble}`}>
                                            {msg.role === "agent" ? (
                                                <div className={styles.markdownContent}>
                                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                </div>
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                        <div className={styles.meta}>
                                            {msg.role === "user" ? "You" : `Agent · ${currentModel.name}`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className={`${styles.messageRow} ${styles.agentRow}`}>
                                    <div className={styles.agentAvatar}><span>🤖</span></div>
                                    <div className={styles.messageContent}>
                                        <div className={`${styles.bubble} ${styles.agentBubble}`}>
                                            <div className={styles.typingIndicator}>
                                                <div className={styles.dot} /><div className={styles.dot} /><div className={styles.dot} />
                                            </div>
                                        </div>
                                        <div className={styles.meta} style={{ color: '#10b981' }}>Thinking via {currentModel.name}...</div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                <div className={styles.inputContainer}>
                    <div className={styles.inputWrapper}>
                        <textarea className={styles.inputField} value={input} onChange={handleInput}
                            onKeyDown={handleKeyDown} placeholder={`Message AgentDB (${currentModel.name})...`}
                            disabled={isTyping} rows={1} />
                    </div>
                    <button className={styles.sendBtn} onClick={handleSend} disabled={!input.trim() || isTyping}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>

                <footer className={styles.mainFooter}>
                    <span>Powered by AgentDB · Storacha · UCAN · IPFS</span>
                    <Link href="/">← Back to Home</Link>
                </footer>
            </main>

            {/* Storacha Login Modal */}
            {showStorachaLogin && (
                <div className={styles.modalOverlay} onClick={() => setShowStorachaLogin(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <h3 className={styles.modalTitle}>🌐 Connect to IPFS</h3>
                        <p className={styles.modalDesc}>
                            Sign in with your email to connect to Storacha&apos;s decentralized IPFS network.
                            This lets you pin and retrieve chat memories.
                        </p>
                        {storacha.state === "waiting-verify" ? (
                            <div className={styles.modalVerify}>
                                <div className={styles.spinner} />
                                <p>Verification email sent to <strong>{storachaEmail}</strong></p>
                                <p className={styles.modalSubtext}>Click the link in your email to complete login</p>
                            </div>
                        ) : (
                            <>
                                <input
                                    className={styles.cidInput}
                                    type="email"
                                    placeholder="your@email.com"
                                    value={storachaEmail}
                                    onChange={e => setStorachaEmail(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && handleStorachaLogin()}
                                />
                                {storacha.error && <p className={styles.modalError}>{storacha.error}</p>}
                                <button
                                    className={styles.newChatBtn}
                                    onClick={handleStorachaLogin}
                                    disabled={!storachaEmail.includes("@") || storacha.state === "logging-in"}
                                    style={{ marginTop: '0.75rem' }}
                                >
                                    {storacha.state === "logging-in" ? "Connecting..." : "Connect →"}
                                </button>
                            </>
                        )}
                        <button className={styles.modalClose} onClick={() => setShowStorachaLogin(false)}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
