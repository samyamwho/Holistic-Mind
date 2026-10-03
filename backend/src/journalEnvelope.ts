import { z } from "zod";

export const journalEnvelopeSchema = z.object({
  version: z.literal(1),
  algorithm: z.literal("xchacha20-poly1305"),
  keyId: z.string().regex(/^[a-f0-9]{32}$/),
  nonce: z.string().regex(/^[a-f0-9]{48}$/),
  ciphertext: z.string().min(32).max(250000).regex(/^(?:[a-f0-9]{2})+$/),
}).strict();
export const encryptedJournalSchema = z.object({
  id: z.uuid(),
  envelope: journalEnvelopeSchema,
}).strict();

// Media ciphertext is stored separately from text entries and never enters recommendations.
export const encryptedJournalMediaSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["image", "audio"]),
  contentType: z.enum(["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp", "audio/mp4", "audio/m4a", "audio/3gpp", "audio/webm", "audio/aac", "audio/x-m4a"]),
  envelope: journalEnvelopeSchema.extend({
    ciphertext: z.string().min(32).max(8_000_032).regex(/^(?:[a-f0-9]{2})+$/),
  }),
}).strict().refine(({ kind, contentType }) => contentType.startsWith(`${kind}/`));

export const encryptedJournalWithMediaSchema = encryptedJournalSchema.extend({
  media: z.array(encryptedJournalMediaSchema).min(1).max(2),
}).strict().refine(({ media }) => new Set(media.map((item) => item.kind)).size === media.length && new Set(media.map((item) => item.id)).size === media.length);
