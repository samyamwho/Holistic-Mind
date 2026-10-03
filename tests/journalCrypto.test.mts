import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createJournalKey, createKeyCheck, decryptJournal, decryptJournalMedia, encryptJournal, encryptJournalMedia, parseRecoveryCode, recoveryCode, verifyKeyCheck } from "../src/services/journal/journalCrypto.ts";
import { encryptedJournalMediaSchema, encryptedJournalSchema } from "../backend/src/journalEnvelope.ts";

const random = async (length: number) => new Uint8Array(randomBytes(length));
const content = { pack: "Daily", prompt: "A private title", text: "म आज शान्त छु 🌱\nA private reflection." };

test("encrypts every content field, recovers on a new device, and uses fresh nonces", async () => {
  const key = await createJournalKey(random); const userId = randomUUID(); const id = randomUUID();
  const envelope = await encryptJournal(key, userId, id, content, random);
  assert.equal(encryptedJournalSchema.safeParse({ id, envelope }).success, true);
  const wire = JSON.stringify({ id, envelope });
  for (const value of Object.values(content)) assert.equal(wire.includes(value), false);
  const recovered = parseRecoveryCode(recoveryCode(key));
  const entry = { id, envelope, createdAt: new Date().toISOString() };
  assert.deepEqual(decryptJournal(recovered, userId, entry), { ...content, id, createdAt: entry.createdAt });
  const again = await encryptJournal(key, userId, id, content, random);
  assert.notEqual(again.nonce, envelope.nonce); assert.notEqual(again.ciphertext, envelope.ciphertext);
  const check = await createKeyCheck(key, userId, random);
  verifyKeyCheck(recovered, userId, check);
  assert.throws(() => decryptJournal(key, userId, { ...entry, id: "vault", envelope: check }));
});

test("rejects wrong keys, accounts, entry IDs, nonce changes, ciphertext changes and unsupported versions", async () => {
  const key = await createJournalKey(random); const userId = randomUUID(); const id = randomUUID();
  const envelope = await encryptJournal(key, userId, id, content, random);
  const entry = { id, envelope, createdAt: "2026-09-13T00:00:00Z" };
  const different = await createJournalKey(random);
  assert.throws(() => decryptJournal({ ...key, secret: different.secret }, userId, entry));
  assert.throws(() => decryptJournal(key, randomUUID(), entry));
  assert.throws(() => decryptJournal(key, userId, { ...entry, id: randomUUID() }));
  const flip = (hex: string) => (hex[0] === "0" ? "1" : "0") + hex.slice(1);
  for (const changed of [
    { nonce: flip(envelope.nonce) }, { ciphertext: flip(envelope.ciphertext) },
    { keyId: different.keyId }, { version: 2 }, { algorithm: "aes" },
  ]) assert.throws(() => decryptJournal(key, userId, { ...entry, envelope: { ...envelope, ...changed } as typeof envelope }));
  const check = await createKeyCheck(key, userId, random);
  assert.throws(() => verifyKeyCheck({ ...key, secret: different.secret }, userId, check));
  assert.throws(() => verifyKeyCheck(key, randomUUID(), check));
});

test("validates recovery codes and rejects plaintext writes and oversized or empty content", async () => {
  const key = await createJournalKey(random); const id = randomUUID();
  for (const value of ["password", recoveryCode(key).slice(0, -1), recoveryCode(key) + ".extra"]) assert.throws(() => parseRecoveryCode(value));
  assert.equal(encryptedJournalSchema.safeParse(content).success, false);
  for (const text of ["", " ", "a".repeat(20001)]) await assert.rejects(encryptJournal(key, id, id, { ...content, text }, random));
  const envelope = await encryptJournal(key, id, id, { ...content, text: "\u0001".repeat(20000) }, random);
  assert.equal(encryptedJournalSchema.safeParse({ id, envelope }).success, true);
  assert.equal(encryptedJournalSchema.safeParse({ id, envelope, text: "accidental plaintext" }).success, false);
});

test("media stays encrypted and is bound to its account, id, kind, and content type", async () => {
  const key = await createJournalKey(random); const userId = randomUUID(); const id = randomUUID();
  const bytes = new Uint8Array([0, 1, 2, 200, 255]);
  const envelope = await encryptJournalMedia(key, userId, id, "image", "image/png", bytes, random);
  const media = { id, kind: "image" as const, contentType: "image/png", createdAt: new Date().toISOString(), envelope };
  assert.equal(encryptedJournalMediaSchema.safeParse(media).success, false); // Server accepts only upload fields.
  assert.equal(encryptedJournalMediaSchema.safeParse({ id, kind: media.kind, contentType: media.contentType, envelope }).success, true);
  assert.deepEqual(decryptJournalMedia(key, userId, media), bytes);
  assert.throws(() => decryptJournalMedia(key, randomUUID(), media));
  assert.throws(() => decryptJournalMedia(key, userId, { ...media, id: randomUUID() }));
  assert.throws(() => decryptJournalMedia(key, userId, { ...media, kind: "audio" }));
  assert.throws(() => decryptJournalMedia(key, userId, { ...media, contentType: "image/jpeg" }));
  assert.equal(encryptedJournalMediaSchema.safeParse({ id, kind: "image", contentType: "image/png", envelope, bytes }).success, false);
  assert.equal(encryptedJournalMediaSchema.safeParse({ id, kind: "audio", contentType: "image/png", envelope }).success, false);
  await assert.rejects(encryptJournalMedia(key, userId, id, "image", "image/png", new Uint8Array(4_000_001), random));
});
