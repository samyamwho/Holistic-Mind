import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from "@noble/ciphers/utils.js";

export type JournalKey = { keyId: string; secret: string };
export type JournalEnvelope = {
  version: 1;
  algorithm: "xchacha20-poly1305";
  keyId: string;
  nonce: string;
  ciphertext: string;
};
export type JournalContent = { pack: string; prompt: string; text: string };
export type EncryptedJournalEntry = { id: string; envelope: JournalEnvelope; createdAt: string };
export type JournalMediaKind = "image" | "audio";
export type JournalMedia = { id: string; entryId?: string | null; kind: JournalMediaKind; contentType: string; createdAt: string };
export type EncryptedJournalMedia = JournalMedia & { envelope: JournalEnvelope };
export type RandomBytes = (length: number) => Promise<Uint8Array>;
const keyPattern = /^[a-f0-9]{32}$/;
const secretPattern = /^[a-f0-9]{64}$/;
const sentinel = "Holistic Mind journal vault v1";
export const MAX_JOURNAL_MEDIA_BYTES = 4_000_000;

export async function createJournalKey(random: RandomBytes): Promise<JournalKey> {
  return { keyId: bytesToHex(await random(16)), secret: bytesToHex(await random(32)) };
}
export function recoveryCode(key: JournalKey) {
  return `HMJ1.${key.keyId}.${key.secret}`;
}
export function parseRecoveryCode(value: string): JournalKey {
  const [version, keyId, secret, extra] = value.trim().replace(/\s/g, "").split(".");
  if (version !== "HMJ1" || !keyPattern.test(keyId ?? "") || !secretPattern.test(secret ?? "") || extra !== undefined) {
    throw new Error("Enter the complete recovery key beginning with HMJ1.");
  }
  return { keyId, secret };
}
function associatedData(userId: string, id: string, keyId: string, purpose: "entry" | "vault") {
  return utf8ToBytes(JSON.stringify(["holistic-mind-journal", 1, "xchacha20-poly1305", userId, id, keyId, purpose]));
}
async function seal(key: JournalKey, userId: string, id: string, value: string, purpose: "entry" | "vault", random: RandomBytes): Promise<JournalEnvelope> {
  const nonce = await random(24);
  const secret = hexToBytes(key.secret);
  const plaintext = utf8ToBytes(value);
  try {
    const ciphertext = xchacha20poly1305(secret, nonce, associatedData(userId, id, key.keyId, purpose)).encrypt(plaintext);
    return { version: 1, algorithm: "xchacha20-poly1305", keyId: key.keyId, nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext) };
  } finally { secret.fill(0); plaintext.fill(0); }
}
function open(key: JournalKey, userId: string, id: string, envelope: JournalEnvelope, purpose: "entry" | "vault") {
  if (envelope?.version !== 1 || envelope.algorithm !== "xchacha20-poly1305" || envelope.keyId !== key.keyId ||
      !/^[a-f0-9]{48}$/.test(envelope.nonce) || envelope.ciphertext.length > 250000 ||
      !/^(?:[a-f0-9]{2}){16,}$/.test(envelope.ciphertext)) {
    throw new Error("This entry uses an unsupported or invalid encryption format.");
  }
  const secret = hexToBytes(key.secret);
  let plaintext: Uint8Array | undefined;
  try {
    plaintext = xchacha20poly1305(secret, hexToBytes(envelope.nonce), associatedData(userId, id, key.keyId, purpose)).decrypt(hexToBytes(envelope.ciphertext));
    return bytesToUtf8(plaintext);
  } catch {
    throw new Error("Unable to decrypt the journal. Check your recovery key; the entry may also be damaged.");
  } finally { secret.fill(0); plaintext?.fill(0); }
}
export function validateJournalContent(value: unknown): JournalContent {
  const entry = value as JournalContent | null;
  if (!entry || typeof entry.pack !== "string" || !entry.pack.trim() || entry.pack.length > 80 ||
      typeof entry.prompt !== "string" || !entry.prompt.trim() || entry.prompt.length > 500 ||
      typeof entry.text !== "string" || !entry.text.trim() || entry.text.length > 20000) {
    throw new Error("Journal entries need a title and 1–20,000 characters of text.");
  }
  return { pack: entry.pack, prompt: entry.prompt, text: entry.text };
}
export async function encryptJournal(key: JournalKey, userId: string, id: string, content: JournalContent, random: RandomBytes) {
  return seal(key, userId, id, JSON.stringify(validateJournalContent(content)), "entry", random);
}
export function decryptJournal(key: JournalKey, userId: string, entry: EncryptedJournalEntry) {
  return { ...validateJournalContent(JSON.parse(open(key, userId, entry.id, entry.envelope, "entry"))), id: entry.id, createdAt: entry.createdAt };
}
export const createKeyCheck = (key: JournalKey, userId: string, random: RandomBytes) => seal(key, userId, "vault", sentinel, "vault", random);
export function verifyKeyCheck(key: JournalKey, userId: string, check: JournalEnvelope) {
  if (open(key, userId, "vault", check, "vault") !== sentinel) throw new Error("This recovery key does not unlock your journal.");
}

function mediaAssociatedData(userId: string, id: string, keyId: string, kind: JournalMediaKind, contentType: string, entryId?: string | null) {
  const fields = ["holistic-mind-journal-media", 1, "xchacha20-poly1305", userId, id, keyId, kind, contentType];
  if (entryId) fields.push(entryId);
  return utf8ToBytes(JSON.stringify(fields));
}

export async function encryptJournalMedia(key: JournalKey, userId: string, id: string, kind: JournalMediaKind, contentType: string, bytes: Uint8Array, random: RandomBytes, entryId?: string): Promise<JournalEnvelope> {
  if (!bytes.length || bytes.length > MAX_JOURNAL_MEDIA_BYTES) throw new Error("Choose a photo or recording smaller than 4 MB.");
  const nonce = await random(24);
  const secret = hexToBytes(key.secret);
  try {
    const ciphertext = xchacha20poly1305(secret, nonce, mediaAssociatedData(userId, id, key.keyId, kind, contentType, entryId)).encrypt(bytes);
    return { version: 1, algorithm: "xchacha20-poly1305", keyId: key.keyId, nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext) };
  } finally { secret.fill(0); }
}

export function decryptJournalMedia(key: JournalKey, userId: string, media: EncryptedJournalMedia): Uint8Array {
  const { id, kind, contentType, envelope } = media;
  if (envelope?.version !== 1 || envelope.algorithm !== "xchacha20-poly1305" || envelope.keyId !== key.keyId ||
      !/^[a-f0-9]{48}$/.test(envelope.nonce) || envelope.ciphertext.length > 8_000_032 ||
      !/^(?:[a-f0-9]{2}){16,}$/.test(envelope.ciphertext)) {
    throw new Error("This journal attachment uses an invalid encryption format.");
  }
  const secret = hexToBytes(key.secret);
  try {
    return xchacha20poly1305(secret, hexToBytes(envelope.nonce), mediaAssociatedData(userId, id, key.keyId, kind, contentType, media.entryId)).decrypt(hexToBytes(envelope.ciphertext));
  } catch {
    throw new Error("Unable to decrypt this journal attachment.");
  } finally { secret.fill(0); }
}
