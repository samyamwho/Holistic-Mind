import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { useAuth } from "./AuthContext";
import { wellnessRequest, type StoredJournalEntry } from "../services/wellness/wellnessApi";
import { loadDeviceJournalKey, saveDeviceJournalKey } from "../services/journal/keyStorage";
import {
  createJournalKey, createKeyCheck, decryptJournal, encryptJournal, parseRecoveryCode,
  recoveryCode, verifyKeyCheck, decryptJournalMedia, encryptJournalMedia,
  type EncryptedJournalEntry, type EncryptedJournalMedia, type JournalContent, type JournalEnvelope,
  type JournalKey, type JournalMedia, type JournalMediaKind,
} from "../services/journal/journalCrypto";

type Vault = { keyCheck: JournalEnvelope | null; legacyCount: number };
type JournalState = "locked" | "setup" | "recover" | "ready";
export type DraftJournalAttachment = { id: string; kind: JournalMediaKind; contentType: string; uri: string };
type JournalContextValue = {
  state: JournalState; busy: boolean; error: string; legacyCount: number; backupCode: string;
  unlock: () => Promise<void>; create: (confirmation: string) => Promise<void>;
  recover: (code: string) => Promise<void>; migrate: () => Promise<void>; lock: () => void;
  showRecovery: () => void; hideRecovery: () => void;
  getEntries: () => Promise<StoredJournalEntry[]>;
  saveEntry: (entry: JournalContent) => Promise<StoredJournalEntry>;
  saveEntryWithMedia: (entry: JournalContent, attachments: DraftJournalAttachment[]) => Promise<StoredJournalEntry>;
  getMedia: () => Promise<JournalMedia[]>;
  saveMedia: (kind: JournalMediaKind, contentType: string, bytes: Uint8Array) => Promise<JournalMedia>;
  openMedia: (id: string) => Promise<{ media: JournalMedia; bytes: Uint8Array }>;
  deleteMedia: (id: string) => Promise<void>;
};
const JournalContext = createContext<JournalContextValue | undefined>(undefined);

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Account changes discard keys, drafts, and in-flight state belonging to the old account.
  return <JournalSession key={user?.id ?? "signed-out"} userId={user?.id}>{children}</JournalSession>;
}

function JournalSession({ userId, children }: { userId?: string; children: React.ReactNode }) {
  const { runAuthenticated } = useAuth();
  const [state, setState] = useState<JournalState>("locked");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [legacyCount, setLegacyCount] = useState(0);
  const [backupCode, setBackupCode] = useState("");
  const key = useRef<JournalKey | null>(null);
  const pendingCheck = useRef<JournalEnvelope | null>(null);
  const generation = useRef(0);
  const active = useRef(true);
  const working = useRef(false);
  const ready = useRef(false);
  const pendingSave = useRef<{ content: string; id: string; envelope: JournalEnvelope } | null>(null);
  const pendingMediaSave = useRef<{ signature: string; id: string; envelope: JournalEnvelope; media: { id: string; kind: JournalMediaKind; contentType: string; envelope: JournalEnvelope }[] } | null>(null);

  const lock = useCallback(() => {
    generation.current++;
    key.current = null; pendingCheck.current = null; ready.current = false;
    pendingSave.current = null;
    pendingMediaSave.current = null;
    setState("locked"); setBackupCode(""); setError("");
  }, []);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; generation.current++; key.current = null; };
  }, [lock]);

  const scope = useCallback(() => {
    const epoch = generation.current;
    const assert = () => {
      if (!userId || !active.current || generation.current !== epoch) throw new Error("Journal locked. Open it again to continue.");
    };
    assert();
    const request = async <T,>(path: string, options?: RequestInit) => {
      assert();
      const data = await runAuthenticated((token) => { assert(); return wellnessRequest<T>(`/journal${path}`, token, options); });
      assert(); return data;
    };
    return { assert, request, userId: userId! };
  }, [userId, runAuthenticated]);

  const perform = async (operation: () => Promise<void>) => {
    if (working.current) return;
    const epoch = generation.current;
    working.current = true; setBusy(true); setError("");
    try { await operation(); }
    catch (failure) {
      if (active.current && epoch === generation.current) setError(failure instanceof Error ? failure.message : "Journal could not be opened. Try again.");
    } finally { working.current = false; if (active.current) setBusy(false); }
  };

  const unlock = () => perform(async () => {
    const session = scope();
    const vault = await session.request<Vault>("/vault");
    setLegacyCount(vault.legacyCount);
    const local = await loadDeviceJournalKey(session.userId); session.assert();
    if (vault.keyCheck) {
      if (local) {
        try { verifyKeyCheck(local, session.userId, vault.keyCheck); }
        catch { setState("recover"); return; }
        key.current = local; ready.current = true; setState("ready");
      } else setState("recover");
      return;
    }
    // Reuse a backed-up local key if a previous vault creation lost its response.
    const candidate = local ?? await createJournalKey(Crypto.getRandomBytesAsync); session.assert();
    const check = await createKeyCheck(candidate, session.userId, Crypto.getRandomBytesAsync); session.assert();
    key.current = candidate; pendingCheck.current = check;
    setBackupCode(recoveryCode(candidate)); setState("setup");
  });

  const create = (confirmation: string) => perform(async () => {
    const session = scope(); const candidate = key.current; const check = pendingCheck.current;
    if (!candidate || !check || confirmation.trim() !== candidate.secret.slice(-8)) throw new Error("Enter the last eight characters of your saved recovery key.");
    // Persist only after the user has confirmed their recovery backup, before upload.
    await saveDeviceJournalKey(session.userId, candidate); session.assert();
    const saved = await session.request<{ keyCheck: JournalEnvelope }>("/vault", { method: "PUT", body: JSON.stringify({ keyCheck: check }) });
    verifyKeyCheck(candidate, session.userId, saved.keyCheck);
    ready.current = true; setBackupCode(""); setState("ready");
  });

  const recover = (code: string) => perform(async () => {
    const session = scope(); const candidate = parseRecoveryCode(code);
    const vault = await session.request<Vault>("/vault");
    if (!vault.keyCheck) throw new Error("No encrypted journal exists for this account yet.");
    verifyKeyCheck(candidate, session.userId, vault.keyCheck);
    await saveDeviceJournalKey(session.userId, candidate); session.assert();
    key.current = candidate; ready.current = true; setLegacyCount(vault.legacyCount); setBackupCode(""); setState("ready");
  });

  const getEntries = useCallback(async () => {
    const session = scope(); const currentKey = key.current;
    if (!ready.current || !currentKey) throw new Error("Open your journal to read its entries.");
    const [encrypted, media] = await Promise.all([session.request<EncryptedJournalEntry[]>(""), session.request<JournalMedia[]>("/media")]);
    return encrypted.map((entry) => ({
      ...decryptJournal(currentKey, session.userId, entry),
      attachments: media.filter((item) => item.entryId === entry.id),
    }));
  }, [scope]);


  const saveEntry = useCallback(async (content: JournalContent) => {
    const session = scope(); const currentKey = key.current;
    if (!ready.current || !currentKey) throw new Error("Open your journal before saving.");
    const serialized = JSON.stringify(content);
    let pending = pendingSave.current;
    if (!pending || pending.content !== serialized) {
      const id = Crypto.randomUUID();
      const envelope = await encryptJournal(currentKey, session.userId, id, content, Crypto.getRandomBytesAsync);
      session.assert();
      pending = { content: serialized, id, envelope };
      pendingSave.current = pending;
    }
    const { id, envelope } = pending;
    session.assert();
    // Token refresh replays the same ID and ciphertext, so an authenticated retry is idempotent.
    const entry = await session.request<EncryptedJournalEntry>("", { method: "POST", body: JSON.stringify({ id, envelope }) });
    const saved = decryptJournal(currentKey, session.userId, entry);
    if (pendingSave.current?.id === id) pendingSave.current = null;
    return saved;
  }, [scope]);

  const saveEntryWithMedia = useCallback(async (content: JournalContent, attachments: DraftJournalAttachment[]) => {
    if (!attachments.length) return saveEntry(content);
    if (attachments.length > 2 || new Set(attachments.map((item) => item.kind)).size !== attachments.length) {
      throw new Error("Add up to one photo and one voice note to an entry.");
    }
    const session = scope(); const currentKey = key.current;
    if (!ready.current || !currentKey) throw new Error("Open your journal before saving.");
    const signature = JSON.stringify([content, attachments.map(({ id, kind, contentType, uri }) => [id, kind, contentType, uri])]);
    let pending = pendingMediaSave.current;
    if (!pending || pending.signature !== signature) {
      const id = Crypto.randomUUID();
      const envelope = await encryptJournal(currentKey, session.userId, id, content, Crypto.getRandomBytesAsync);
      const media = [];
      for (const item of attachments) {
        const bytes = await new File(item.uri).bytes();
        try {
          const encrypted = await encryptJournalMedia(currentKey, session.userId, item.id, item.kind, item.contentType, bytes, Crypto.getRandomBytesAsync, id);
          media.push({ id: item.id, kind: item.kind, contentType: item.contentType, envelope: encrypted });
        } finally { bytes.fill(0); }
      }
      session.assert();
      pending = { signature, id, envelope, media };
      pendingMediaSave.current = pending;
    }
    const saved = await session.request<{ entry: EncryptedJournalEntry; media: JournalMedia[] }>("/with-media", {
      method: "POST", body: JSON.stringify({ id: pending.id, envelope: pending.envelope, media: pending.media }),
    });
    const entry = { ...decryptJournal(currentKey, session.userId, saved.entry), attachments: saved.media };
    if (pendingMediaSave.current?.id === pending.id) pendingMediaSave.current = null;
    return entry;
  }, [scope, saveEntry]);

  const getMedia = useCallback(async () => {
    const session = scope();
    if (!ready.current || !key.current) throw new Error("Open your journal to see its attachments.");
    return session.request<JournalMedia[]>("/media");
  }, [scope]);

  const saveMedia = useCallback(async (kind: JournalMediaKind, contentType: string, bytes: Uint8Array) => {
    const session = scope(); const currentKey = key.current;
    if (!ready.current || !currentKey) throw new Error("Open your journal before saving.");
    const id = Crypto.randomUUID();
    const envelope = await encryptJournalMedia(currentKey, session.userId, id, kind, contentType, bytes, Crypto.getRandomBytesAsync);
    session.assert();
    return session.request<JournalMedia>("/media", { method: "POST", body: JSON.stringify({ id, kind, contentType, envelope }) });
  }, [scope]);

  const openMedia = useCallback(async (id: string) => {
    const session = scope(); const currentKey = key.current;
    if (!ready.current || !currentKey) throw new Error("Open your journal to view this attachment.");
    const media = await session.request<EncryptedJournalMedia>(`/media/${encodeURIComponent(id)}`);
    const bytes = decryptJournalMedia(currentKey, session.userId, media);
    session.assert();
    return { media, bytes };
  }, [scope]);

  const deleteMedia = useCallback(async (id: string) => {
    const session = scope();
    if (!ready.current || !key.current) throw new Error("Open your journal to remove this attachment.");
    await session.request(`/media/${encodeURIComponent(id)}`, { method: "DELETE" });
  }, [scope]);

  const migrate = () => perform(async () => {
    const session = scope(); const currentKey = key.current;
    if (!ready.current || !currentKey) throw new Error("Open your journal first.");
    while (true) {
      const entries = await session.request<StoredJournalEntry[]>("/legacy");
      if (!entries.length) break;
      for (const entry of entries) {
        const content = { pack: entry.pack, prompt: entry.prompt, text: entry.text };
        const envelope = await encryptJournal(currentKey, session.userId, entry.id, content, Crypto.getRandomBytesAsync);
        session.assert();
        const verified = decryptJournal(currentKey, session.userId, { ...entry, envelope });
        if (verified.text !== content.text || verified.pack !== content.pack || verified.prompt !== content.prompt) throw new Error("Migration verification failed; original entry retained.");
        const saved = await session.request<EncryptedJournalEntry>(`/${entry.id}/encrypt`, { method: "PUT", body: JSON.stringify({ id: entry.id, envelope }) });
        const restored = decryptJournal(currentKey, session.userId, saved);
        if (restored.text !== content.text || restored.pack !== content.pack || restored.prompt !== content.prompt) throw new Error("Migrated entry did not match. Stop and contact support.");
        setLegacyCount((count) => Math.max(0, count - 1));
      }
    }
    const vault = await session.request<Vault>("/vault"); setLegacyCount(vault.legacyCount);
  });

  return <JournalContext.Provider value={{ state, busy, error, legacyCount, backupCode, unlock, create, recover, migrate, lock,
    getEntries, saveEntry, saveEntryWithMedia, getMedia, saveMedia, openMedia, deleteMedia,
    showRecovery: () => { if (ready.current && key.current) setBackupCode(recoveryCode(key.current)); },
    hideRecovery: () => setBackupCode(""),
  }}>{children}</JournalContext.Provider>;
}

export function useJournal() {
  const value = useContext(JournalContext);
  if (!value) throw new Error("useJournal must be used inside JournalProvider");
  return value;
}
