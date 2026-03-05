"use client";

import { useState, useEffect, useCallback } from "react";

type StorachaState = "disconnected" | "logging-in" | "waiting-verify" | "connected";

export function useStoracha() {
    const [state, setState] = useState<StorachaState>("disconnected");
    const [client, setClient] = useState<any>(null);
    const [email, setEmail] = useState<string>("");
    const [spaceDid, setSpaceDid] = useState<string>("");
    const [error, setError] = useState<string>("");

    // Initialize client from persisted state on mount
    useEffect(() => {
        (async () => {
            try {
                const { create } = await import("@storacha/client");
                const c = await create();
                setClient(c);
                // Check if already logged in (persisted in IndexedDB)
                const spaces = c.spaces();
                if (spaces.length > 0) {
                    await c.setCurrentSpace(spaces[0].did());
                    setSpaceDid(spaces[0].did());
                    setState("connected");
                }
            } catch (e: any) {
                console.warn("[Storacha] Failed to initialize client:", e);
            }
        })();
    }, []);

    const login = useCallback(async (userEmail: string) => {
        if (!client) return;
        setError("");
        setState("logging-in");

        try {
            setEmail(userEmail);
            setState("waiting-verify");
            
            // This sends a verification email and waits for the user to click the link
            const account = await client.login(userEmail);
            
            // Wait for payment plan (free tier) — this resolves after email verification
            await account.plan.wait();

            // Check existing spaces or create one
            const spaces = client.spaces();
            let space;
            if (spaces.length > 0) {
                space = spaces[0];
            } else {
                space = await client.createSpace("agentdb-space", { account });
            }
            
            await client.setCurrentSpace(space.did());
            setSpaceDid(space.did());
            setState("connected");
        } catch (e: any) {
            console.error("[Storacha] Login failed:", e);
            setError(e.message || "Login failed");
            setState("disconnected");
        }
    }, [client]);

    const upload = useCallback(async (data: any): Promise<string> => {
        if (!client || state !== "connected") {
            throw new Error("Storacha not connected. Please connect first.");
        }
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const file = new File([blob], "memory.json", { type: "application/json" });
        const cid = await client.uploadFile(file);
        return cid.toString();
    }, [client, state]);

    const disconnect = useCallback(() => {
        setClient(null);
        setState("disconnected");
        setSpaceDid("");
        setEmail("");
        // Re-initialize fresh client
        (async () => {
            const { create } = await import("@storacha/client");
            const c = await create();
            setClient(c);
        })();
    }, []);

    return { state, email, spaceDid, error, login, upload, disconnect };
}
