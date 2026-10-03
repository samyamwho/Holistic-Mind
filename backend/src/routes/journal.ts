import { Router } from "express";
import { z } from "zod";
import { pool } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";
import { encryptedJournalMediaSchema, encryptedJournalSchema, encryptedJournalWithMediaSchema, journalEnvelopeSchema } from "../journalEnvelope.js";

export const journalRouter = Router();
journalRouter.use(authenticate);
// Neither key material nor plaintext belongs in these new-write schemas.
const vaultSchema = z.object({ keyCheck: journalEnvelopeSchema }).strict();

journalRouter.get("/vault", async (_request, response, next) => {
  try {
    const [vault, legacy] = await Promise.all([
      pool.query("SELECT key_check FROM journal_vaults WHERE user_id = $1", [response.locals.userId]),
      pool.query("SELECT COUNT(*)::int AS count FROM journal_entries WHERE user_id = $1 AND envelope IS NULL", [response.locals.userId]),
    ]);
    response.set("Cache-Control", "no-store").json({ data: {
      keyCheck: vault.rows[0]?.key_check ?? null, legacyCount: legacy.rows[0].count,
    } });
  } catch (error) { next(error); }
});

// Create once. A password reset or another device cannot replace the vault key.
journalRouter.put("/vault", async (request, response, next) => {
  const parsed = vaultSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.keyCheck.ciphertext.length > 1024) {
    response.status(400).json({ error: "Invalid journal vault." }); return;
  }
  try {
    const check = parsed.data.keyCheck;
    await pool.query(
      `INSERT INTO journal_vaults (user_id, key_id, key_check) VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`, [response.locals.userId, check.keyId, check],
    );
    const result = await pool.query("SELECT key_check FROM journal_vaults WHERE user_id = $1", [response.locals.userId]);
    const saved = result.rows[0]?.key_check;
    if (!saved || saved.keyId !== check.keyId || saved.nonce !== check.nonce || saved.ciphertext !== check.ciphertext) {
      response.status(409).json({ error: "A journal key already exists. Use its recovery key." }); return;
    }
    response.set("Cache-Control", "no-store").json({ data: { keyCheck: saved } });
  } catch (error) { next(error); }
});

journalRouter.get("/", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, envelope, created_at AS "createdAt" FROM journal_entries
       WHERE user_id = $1 AND envelope IS NOT NULL ORDER BY created_at DESC`, [response.locals.userId],
    );
    response.set("Cache-Control", "no-store").json({ data: result.rows });
  } catch (error) { next(error); }
});

// Explicit legacy-only endpoint: ordinary journal reads never return plaintext.
journalRouter.get("/legacy", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, pack, prompt, content AS text, created_at AS "createdAt"
       FROM journal_entries WHERE user_id = $1 AND envelope IS NULL ORDER BY created_at DESC LIMIT 100`,
      [response.locals.userId],
    );
    response.set("Cache-Control", "no-store").json({ data: result.rows });
  } catch (error) { next(error); }
});

journalRouter.get("/media", async (_request, response, next) => {
  try {
    const result = await pool.query(
      `SELECT id, entry_id AS "entryId", kind, content_type AS "contentType", created_at AS "createdAt" FROM journal_media
       WHERE user_id = $1 ORDER BY created_at DESC`, [response.locals.userId],
    );
    response.set("Cache-Control", "no-store").json({ data: result.rows });
  } catch (error) { next(error); }
});

journalRouter.get("/media/:id", async (request, response, next) => {
  const id = z.uuid().safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: "Invalid journal media id." }); return; }
  try {
    const result = await pool.query(
      `SELECT id, entry_id AS "entryId", kind, content_type AS "contentType", envelope, created_at AS "createdAt" FROM journal_media
       WHERE id = $1 AND user_id = $2`, [id.data, response.locals.userId],
    );
    if (!result.rows[0]) { response.status(404).json({ error: "Journal media not found." }); return; }
    response.set("Cache-Control", "no-store").json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

journalRouter.post("/media", async (request, response, next) => {
  const parsed = encryptedJournalMediaSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid encrypted journal media." }); return; }
  try {
    const { id, kind, contentType, envelope } = parsed.data;
    const result = await pool.query(
      `INSERT INTO journal_media (id, user_id, kind, content_type, envelope)
       SELECT $1, $2, $3, $4, $5 WHERE EXISTS
         (SELECT 1 FROM journal_vaults WHERE user_id = $2 AND key_id = $6)
       ON CONFLICT (id) DO UPDATE SET id = journal_media.id
       WHERE journal_media.user_id = EXCLUDED.user_id
         AND journal_media.kind = EXCLUDED.kind AND journal_media.content_type = EXCLUDED.content_type
         AND journal_media.envelope = EXCLUDED.envelope
       RETURNING id, kind, content_type AS "contentType", created_at AS "createdAt"`,
      [id, response.locals.userId, kind, contentType, envelope, envelope.keyId],
    );
    if (!result.rows[0]) { response.status(409).json({ error: "Journal media could not be saved with this key or id." }); return; }
    response.status(201).set("Cache-Control", "no-store").json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

journalRouter.delete("/media/:id", async (request, response, next) => {
  const id = z.uuid().safeParse(request.params.id);
  if (!id.success) { response.status(400).json({ error: "Invalid journal media id." }); return; }
  try {
    const result = await pool.query("DELETE FROM journal_media WHERE id = $1 AND user_id = $2 RETURNING id", [id.data, response.locals.userId]);
    if (!result.rows[0]) { response.status(404).json({ error: "Journal media not found." }); return; }
    response.set("Cache-Control", "no-store").json({ data: { deleted: true } });
  } catch (error) { next(error); }
});

// The entry and its encrypted attachments succeed or fail as one journal save.
journalRouter.post("/with-media", async (request, response, next) => {
  const parsed = encryptedJournalWithMediaSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Invalid encrypted journal entry or attachments." }); return; }
  const { id, envelope, media } = parsed.data;
  if (media.some((item) => item.envelope.keyId !== envelope.keyId)) {
    response.status(400).json({ error: "Journal attachments must use the entry key." }); return;
  }
  const client = await pool.connect().catch(next);
  if (!client) return;
  try {
    await client.query("BEGIN");
    const vault = await client.query("SELECT key_id FROM journal_vaults WHERE user_id = $1", [response.locals.userId]);
    if (vault.rows[0]?.key_id !== envelope.keyId) {
      await client.query("ROLLBACK"); response.status(409).json({ error: "Unlock your journal with its recovery key first." }); return;
    }
    const entry = await client.query(
      `INSERT INTO journal_entries (id, user_id, envelope) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET id = journal_entries.id
       WHERE journal_entries.user_id = EXCLUDED.user_id AND journal_entries.envelope = EXCLUDED.envelope
       RETURNING id, envelope, created_at AS "createdAt"`, [id, response.locals.userId, envelope],
    );
    if (!entry.rows[0]) {
      await client.query("ROLLBACK"); response.status(409).json({ error: "This journal entry already exists." }); return;
    }
    const savedMedia = [];
    for (const item of media) {
      const saved = await client.query(
        `INSERT INTO journal_media (id, user_id, entry_id, kind, content_type, envelope)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET id = journal_media.id
         WHERE journal_media.user_id = EXCLUDED.user_id AND journal_media.entry_id = EXCLUDED.entry_id
           AND journal_media.kind = EXCLUDED.kind AND journal_media.content_type = EXCLUDED.content_type
           AND journal_media.envelope = EXCLUDED.envelope
         RETURNING id, entry_id AS "entryId", kind, content_type AS "contentType", created_at AS "createdAt"`,
        [item.id, response.locals.userId, id, item.kind, item.contentType, item.envelope],
      );
      if (!saved.rows[0]) {
        await client.query("ROLLBACK"); response.status(409).json({ error: "An attachment id already exists." }); return;
      }
      savedMedia.push(saved.rows[0]);
    }
    await client.query("COMMIT");
    response.status(201).set("Cache-Control", "no-store").json({ data: { entry: entry.rows[0], media: savedMedia } });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally { client.release(); }
});

journalRouter.post("/", async (request, response, next) => {
  const parsed = encryptedJournalSchema.safeParse(request.body);
  if (!parsed.success) { response.status(400).json({ error: "Update the app to save encrypted journal entries." }); return; }
  try {
    const { id, envelope } = parsed.data;
    const vault = await pool.query("SELECT key_id FROM journal_vaults WHERE user_id = $1", [response.locals.userId]);
    if (vault.rows[0]?.key_id !== envelope.keyId) {
      response.status(409).json({ error: "Unlock your journal with its recovery key first." }); return;
    }
    const result = await pool.query(
      `INSERT INTO journal_entries (id, user_id, envelope) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET id = journal_entries.id
       WHERE journal_entries.user_id = EXCLUDED.user_id AND journal_entries.envelope = EXCLUDED.envelope
       RETURNING id, envelope, created_at AS "createdAt"`, [id, response.locals.userId, envelope],
    );
    if (!result.rows[0]) { response.status(409).json({ error: "This journal entry already exists." }); return; }
    response.status(201).json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

journalRouter.put("/:id/encrypt", async (request, response, next) => {
  const parsed = encryptedJournalSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.id !== request.params.id) {
    response.status(400).json({ error: "Invalid encrypted journal entry." }); return;
  }
  try {
    const { id, envelope } = parsed.data;
    const result = await pool.query(
      `UPDATE journal_entries SET envelope = $3, pack = NULL, prompt = NULL, content = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND envelope IS NULL
         AND EXISTS (SELECT 1 FROM journal_vaults WHERE user_id = $2 AND key_id = $4)
       RETURNING id, envelope, created_at AS "createdAt"`, [id, response.locals.userId, envelope, envelope.keyId],
    );
    // A retry or a concurrent device may already have migrated this immutable entry.
    const saved = result.rows[0] ?? (await pool.query(
      `SELECT id, envelope, created_at AS "createdAt" FROM journal_entries
       WHERE id = $1 AND user_id = $2 AND envelope IS NOT NULL AND envelope->>'keyId' = $3`,
      [id, response.locals.userId, envelope.keyId],
    )).rows[0];
    if (!saved) { response.status(409).json({ error: "Entry could not be migrated. Reload your journal." }); return; }
    response.json({ data: saved });
  } catch (error) { next(error); }
});
