import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { PGlite } from "../backend/node_modules/@electric-sql/pglite/dist/index.js";
import { SignJWT } from "../backend/node_modules/jose/dist/webapi/index.js";
import { createJournalKey, createKeyCheck, decryptJournal, decryptJournalMedia, encryptJournal, encryptJournalMedia } from "../src/services/journal/journalCrypto.ts";

// Deliberately isolated from .env files and every real database or external service.
Object.assign(process.env, {
  DOTENV_CONFIG_PATH: "/dev/null", NODE_ENV: "test", DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
  DATABASE_SSL: "false", ADMIN_API_KEY: "test-only-admin-key-0000000000000", ACCESS_TOKEN_SECRET: "test-only-access-secret-00000000000000000",
  S3_BUCKET: "test", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test", S3_PUBLIC_BASE_URL: "http://localhost/test",
  EMAIL_DELIVERY_MODE: "log", S3_ENDPOINT: "http://localhost:1", AUTO_MIGRATE: "false",
});
delete process.env.DATABASE_TUNNEL_HOST; delete process.env.DATABASE_TUNNEL_PORT;
const { pool, ensureSchema } = await import("../backend/src/db.ts");
const { app } = await import("../backend/src/app.ts");
const random = async (length: number) => new Uint8Array(randomBytes(length));

test("journal API: legacy migration, ciphertext-only writes, retries, ownership and immutable recovery", async () => {
  const db = new PGlite();
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  pool.query = (async (sql: string, values?: unknown[]) => values ? db.query(sql, values) : (await db.exec(sql)).at(-1)) as typeof pool.query;
  pool.connect = (async () => ({ query: (sql: string, values?: unknown[]) => db.query(sql, values), release: () => {} })) as typeof pool.connect;
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    // An older development build created this table without content_type.
    await db.query(`CREATE TABLE journal_media (
      id UUID PRIMARY KEY, user_id UUID NOT NULL, kind TEXT NOT NULL,
      envelope JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await ensureSchema();
    await ensureSchema(); // Schema changes are safe to rerun.
    assert.deepEqual((await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'journal_media' AND column_name IN ('content_type', 'entry_id') ORDER BY column_name")).rows.map((row) => row.column_name), ["content_type", "entry_id"]);
    const userId = randomUUID(), otherUser = randomUUID(), legacyId = randomUUID();
    for (const id of [userId, otherUser]) await db.query("INSERT INTO users (id, email) VALUES ($1, $2)", [id, `${id}@example.test`]);
    const content = { pack: "Daily", prompt: "A private title", text: "A private old entry 🌿" };
    await db.query("INSERT INTO journal_entries (id, user_id, pack, prompt, content) VALUES ($1,$2,$3,$4,$5)", [legacyId, userId, content.pack, content.prompt, content.text]);
    const token = async (id: string) => new SignJWT({ tokenType: "access" }).setProtectedHeader({ alg: "HS256" }).setSubject(id)
      .setIssuer("holistic-mind-api").setAudience("holistic-mind-mobile").setExpirationTime("10m")
      .sign(new TextEncoder().encode(process.env.ACCESS_TOKEN_SECRET));
    const ownerToken = await token(userId), otherToken = await token(otherUser);
    server = app.listen(0, "127.0.0.1"); await once(server, "listening");
    const address = server.address() as { port: number };
    const request = async (path: string, method = "GET", body?: unknown, accessToken = ownerToken) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/wellness/journal${path}`, {
        method, headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() as any, cache: response.headers.get("cache-control") };
    };
    assert.equal((await request("", "GET", undefined, "invalid")).status, 401);
    assert.equal((await request("/vault")).body.data.legacyCount, 1);
    assert.deepEqual((await request("")).body.data, []); // Ordinary reads do not expose legacy plaintext.
    const legacy = await request("/legacy"); assert.equal(legacy.body.data[0].text, content.text); assert.equal(legacy.cache, "no-store");
    assert.deepEqual((await request("/legacy", "GET", undefined, otherToken)).body.data, []);
    assert.equal((await request("", "POST", content)).status, 400);

    const key = await createJournalKey(random); const check = await createKeyCheck(key, userId, random);
    const envelope = await encryptJournal(key, userId, legacyId, content, random);
    assert.equal((await request(`/${legacyId}/encrypt`, "PUT", { id: legacyId, envelope })).status, 409);
    assert.equal((await request("/vault", "PUT", { keyCheck: check })).status, 200);
    assert.equal((await request("/vault", "PUT", { keyCheck: check })).status, 200);
    const wrongKey = await createJournalKey(random);
    assert.equal((await request("/vault", "PUT", { keyCheck: await createKeyCheck(wrongKey, userId, random) })).status, 409);
    assert.equal((await request(`/${legacyId}/encrypt`, "PUT", { id: legacyId, envelope }, otherToken)).status, 409);
    assert.equal((await request("/vault")).body.data.legacyCount, 1); // Failed attempts preserved text.
    const saved = await request(`/${legacyId}/encrypt`, "PUT", { id: legacyId, envelope }); assert.equal(saved.status, 200);
    assert.equal(decryptJournal(key, userId, saved.body.data).text, content.text);
    assert.deepEqual((await db.query("SELECT pack, prompt, content FROM journal_entries WHERE id = $1", [legacyId])).rows[0], { pack: null, prompt: null, content: null });
    assert.equal((await request(`/${legacyId}/encrypt`, "PUT", { id: legacyId, envelope })).status, 200);
    assert.equal((await request("/vault")).body.data.legacyCount, 0);
    assert.deepEqual((await request("/legacy")).body.data, []);

    const id = randomUUID(); const newEnvelope = await encryptJournal(key, userId, id, content, random);
    assert.equal((await request("", "POST", { id, envelope: newEnvelope })).status, 201);
    assert.equal((await request("", "POST", { id, envelope: newEnvelope })).status, 201);
    assert.equal((await request("", "POST", { id, envelope: newEnvelope, text: content.text })).status, 400);
    assert.equal((await request("", "POST", { id, envelope })).status, 409);
    assert.equal((await request("", "POST", { id: randomUUID(), envelope: { ...envelope, keyId: wrongKey.keyId } })).status, 409);
    assert.equal((await request("")).body.data.length, 2);
    assert.deepEqual((await request("", "GET", undefined, otherToken)).body.data, []);
    const wire = JSON.stringify((await request("")).body);
    for (const value of [...Object.values(content), key.secret]) assert.equal(wire.includes(value), false);
    // The full permitted Unicode/control-character payload survives the HTTP parser and PostgreSQL.
    const largeId = randomUUID(); const largeContent = { ...content, text: "\u0001".repeat(20000) };
    const largeEnvelope = await encryptJournal(key, userId, largeId, largeContent, random);
    const largeSaved = await request("", "POST", { id: largeId, envelope: largeEnvelope });
    assert.equal(largeSaved.status, 201); assert.equal(decryptJournal(key, userId, largeSaved.body.data).text, largeContent.text);
    const mediaId = randomUUID(); const photo = new Uint8Array([9, 8, 7, 6]);
    const mediaEnvelope = await encryptJournalMedia(key, userId, mediaId, "image", "image/png", photo, random);
    const upload = { id: mediaId, kind: "image", contentType: "image/png", envelope: mediaEnvelope };
    assert.equal((await request("/media", "POST", { ...upload, bytes: [...photo] })).status, 400);
    assert.equal((await request("/media", "POST", upload, otherToken)).status, 409);
    assert.equal((await request("/media", "POST", upload)).status, 201);
    assert.equal((await request("/media", "POST", upload)).status, 201);
    assert.equal((await request("/media")).body.data.length, 1);
    assert.deepEqual((await request("/media", "GET", undefined, otherToken)).body.data, []);
    const opened = await request(`/media/${mediaId}`);
    assert.equal(opened.cache, "no-store");
    assert.deepEqual(decryptJournalMedia(key, userId, opened.body.data), photo);
    assert.equal((await request(`/media/${mediaId}`, "GET", undefined, otherToken)).status, 404);
    assert.equal((await request(`/media/${mediaId}`, "DELETE", undefined, otherToken)).status, 404);
    assert.equal((await request(`/media/${mediaId}`, "DELETE")).status, 200);
    assert.equal((await request(`/media/${mediaId}`)).status, 404);
    const linkedId = randomUUID(), linkedMediaId = randomUUID();
    const linkedEnvelope = await encryptJournal(key, userId, linkedId, content, random);
    const linkedMediaEnvelope = await encryptJournalMedia(key, userId, linkedMediaId, "image", "image/png", photo, random, linkedId);
    const linkedUpload = { id: linkedId, envelope: linkedEnvelope, media: [{ id: linkedMediaId, kind: "image", contentType: "image/png", envelope: linkedMediaEnvelope }] };
    const linked = await request("/with-media", "POST", linkedUpload);
    assert.equal(linked.status, 201);
    assert.equal(linked.body.data.media[0].entryId, linkedId);
    assert.equal((await request("/with-media", "POST", linkedUpload)).status, 201);
    assert.equal((await request("/with-media", "POST", { ...linkedUpload, media: [linkedUpload.media[0], linkedUpload.media[0]] })).status, 400);
    assert.equal((await request("/with-media", "POST", linkedUpload, otherToken)).status, 409);
    const conflictingId = randomUUID();
    const conflictingEnvelope = await encryptJournal(key, userId, conflictingId, content, random);
    const conflictingMediaEnvelope = await encryptJournalMedia(key, userId, linkedMediaId, "image", "image/png", photo, random, conflictingId);
    assert.equal((await request("/with-media", "POST", { id: conflictingId, envelope: conflictingEnvelope, media: [{ ...linkedUpload.media[0], envelope: conflictingMediaEnvelope }] })).status, 409);
    assert.equal((await db.query("SELECT count(*)::int AS count FROM journal_entries WHERE id = $1", [conflictingId])).rows[0].count, 0);
    const linkedOpened = await request(`/media/${linkedMediaId}`);
    assert.deepEqual(decryptJournalMedia(key, userId, linkedOpened.body.data), photo);
    assert.throws(() => decryptJournalMedia(key, userId, { ...linkedOpened.body.data, entryId: randomUUID() }));
    assert.equal((await db.query("SELECT count(*)::int AS count FROM journal_media WHERE entry_id = $1", [linkedId])).rows[0].count, 1);
    await db.query("DELETE FROM users WHERE id = $1", [userId]);
    assert.deepEqual((await db.query("SELECT * FROM journal_vaults WHERE user_id = $1", [userId])).rows, []);
    assert.deepEqual((await db.query("SELECT * FROM journal_entries WHERE user_id = $1", [userId])).rows, []);
    assert.deepEqual((await db.query("SELECT * FROM journal_media WHERE user_id = $1", [userId])).rows, []);
  } finally {
    if (server?.listening) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    pool.query = originalQuery; pool.connect = originalConnect; await pool.end(); await db.close();
  }
});
