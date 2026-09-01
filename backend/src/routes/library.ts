import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { pool, type LibraryChapterAttachmentRow, type LibraryChapterRow, type LibraryCourseRow, type LibraryModuleRow } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { assertObjectExists, createAssetUploadUrl, deleteObject, getPublicObjectUrl } from "../storage.js";

const idSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150);
const statusSchema = z.enum(["draft", "published", "archived"]);
const courseSchema = z.object({
  id: idSchema, title: z.string().trim().min(1).max(160), subtitle: z.string().trim().max(240).nullable().default(null),
  description: z.string().trim().max(3000).nullable().default(null), category: z.string().trim().min(1).max(100),
  level: z.enum(["all_levels", "beginner", "intermediate", "advanced"]).default("all_levels"),
  coverImageUrl: z.url().nullable().default(null), status: statusSchema.default("draft"), displayOrder: z.number().int().min(0).default(0),
});
const moduleSchema = z.object({
  id: idSchema, courseId: idSchema, title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).nullable().default(null), status: statusSchema.default("draft"), displayOrder: z.number().int().min(0).default(0),
});
const chapterSchema = z.object({
  id: idSchema, courseId: idSchema, moduleId: idSchema, title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(3000).nullable().default(null),
  chapterType: z.enum(["audio", "video", "pdf", "interactive_qna", "mcq"]).default("video"),
  interactiveContent: z.record(z.string(), z.unknown()).default({}),
  mediaType: z.enum(["audio", "video", "pdf"]).default("video"),
  mediaUrl: z.url().nullable().default(null), mediaContentType: z.string().trim().max(100).nullable().default(null),
  thumbnailUrl: z.url().nullable().default(null), durationSeconds: z.number().int().positive().nullable().default(null),
  status: statusSchema.default("draft"), displayOrder: z.number().int().min(0).default(0),
});
const courseUpdateSchema = courseSchema.omit({ id: true }).partial().refine((v) => Object.keys(v).length > 0);
const moduleUpdateSchema = moduleSchema.omit({ id: true }).partial().refine((v) => Object.keys(v).length > 0);
const chapterUpdateSchema = chapterSchema.omit({ id: true }).partial().refine((v) => Object.keys(v).length > 0);
const imageUploadSchema = z.object({ fileName: z.string().min(1).max(180), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]) });
const mediaContentTypeSchema = z.enum(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "audio/aac", "audio/ogg", "video/mp4", "video/quicktime", "video/webm", "application/pdf"]);
const mediaUploadSchema = z.object({ fileName: z.string().min(1).max(180), contentType: mediaContentTypeSchema, fileSize: z.number().int().positive().max(500 * 1024 * 1024) });
const completeUploadSchema = z.object({ objectKey: z.string().min(1).max(500), contentType: mediaContentTypeSchema, durationSeconds: z.number().int().positive().optional() });
const attachmentUploadSchema = z.object({ fileName: z.string().min(1).max(180), contentType: z.literal("application/pdf"), fileSize: z.number().int().positive().max(100 * 1024 * 1024) });
const attachmentCompleteSchema = z.object({ objectKey: z.string().min(1).max(500), title: z.string().trim().min(1).max(180), fileSize: z.number().int().positive().max(100 * 1024 * 1024), displayOrder: z.number().int().min(0).default(0) });
const attachmentUpdateSchema = z.object({ title: z.string().trim().min(1).max(180).optional(), displayOrder: z.number().int().min(0).optional() }).refine((value) => Object.keys(value).length > 0);

function serializeAttachment(row: LibraryChapterAttachmentRow) {
  return { id: row.id, chapterId: row.chapter_id, title: row.title, url: row.file_url,
    contentType: row.content_type, fileSize: row.file_size === null ? null : Number(row.file_size), displayOrder: row.display_order };
}

function serializeChapter(row: LibraryChapterRow, attachments: LibraryChapterAttachmentRow[] = []) {
  return { id: row.id, courseId: row.course_id, moduleId: row.course_module_id, title: row.title, description: row.description,
    chapterType: row.chapter_type, interactiveContent: row.interactive_content, mediaType: row.media_type,
    mediaUrl: row.media_url, mediaContentType: row.media_content_type, thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds, status: row.status, displayOrder: row.display_order,
    attachments: attachments.map(serializeAttachment) };
}
function serializeModule(row: LibraryModuleRow, chapters: LibraryChapterRow[] = [], attachmentsByChapter = new Map<string, LibraryChapterAttachmentRow[]>()) {
  return { id: row.id, courseId: row.course_id, title: row.title, description: row.description, status: row.status,
    displayOrder: row.display_order, chapters: chapters.map((chapter) => serializeChapter(chapter, attachmentsByChapter.get(chapter.id) ?? [])) };
}
function serializeCourse(row: LibraryCourseRow, modules: ReturnType<typeof serializeModule>[] = []) {
  return { id: row.id, title: row.title, subtitle: row.subtitle, description: row.description, category: row.category,
    level: row.level, coverImageUrl: row.cover_image_url, status: row.status, displayOrder: row.display_order, modules };
}
async function listCourses(includeUnpublished: boolean) {
  const courseFilter = includeUnpublished ? "" : "WHERE status = 'published'";
  const chapterFilter = includeUnpublished ? "WHERE course_module_id IS NOT NULL" : "WHERE status = 'published' AND course_module_id IS NOT NULL";
  const [courses, modules, chapters, attachments] = await Promise.all([
    pool.query<LibraryCourseRow>(`SELECT * FROM library_courses ${courseFilter} ORDER BY display_order, title`),
    pool.query<LibraryModuleRow>(`SELECT * FROM library_course_modules ${courseFilter} ORDER BY display_order, title`),
    pool.query<LibraryChapterRow>(`SELECT * FROM library_modules ${chapterFilter} ORDER BY display_order, title`),
    pool.query<LibraryChapterAttachmentRow>(`SELECT attachment.* FROM library_chapter_attachments attachment JOIN library_modules chapter ON chapter.id=attachment.chapter_id ${includeUnpublished ? "" : "WHERE chapter.status = 'published'"} ORDER BY attachment.display_order, attachment.created_at`),
  ]);
  const attachmentsByChapter = new Map<string, LibraryChapterAttachmentRow[]>();
  for (const attachment of attachments.rows) {
    const items = attachmentsByChapter.get(attachment.chapter_id) ?? [];
    items.push(attachment); attachmentsByChapter.set(attachment.chapter_id, items);
  }
  const chaptersByModule = new Map<string, LibraryChapterRow[]>();
  for (const chapter of chapters.rows) {
    const items = chaptersByModule.get(chapter.course_module_id) ?? [];
    items.push(chapter); chaptersByModule.set(chapter.course_module_id, items);
  }
  const modulesByCourse = new Map<string, ReturnType<typeof serializeModule>[]>();
  for (const module of modules.rows) {
    const items = modulesByCourse.get(module.course_id) ?? [];
    items.push(serializeModule(module, chaptersByModule.get(module.id) ?? [], attachmentsByChapter)); modulesByCourse.set(module.course_id, items);
  }
  return courses.rows.map((course) => serializeCourse(course, modulesByCourse.get(course.id) ?? []));
}

export const libraryRouter = Router();
libraryRouter.get("/admin/all", requireAdmin, async (_req, res, next) => { try { res.set("Cache-Control", "no-store"); res.json({ data: await listCourses(true) }); } catch (e) { next(e); } });
libraryRouter.get("/", async (_req, res, next) => { try { res.set("Cache-Control", "no-store"); res.json({ data: await listCourses(false) }); } catch (e) { next(e); } });
libraryRouter.get("/:courseId", async (req, res, next) => { const id = idSchema.safeParse(req.params.courseId); if (!id.success) return void res.status(400).json({ error: "Invalid course id" }); try { const course = (await listCourses(false)).find((item) => item.id === id.data); if (!course) return void res.status(404).json({ error: "Course not found" }); res.json({ data: course }); } catch (e) { next(e); } });

libraryRouter.post("/courses", requireAdmin, async (req, res, next) => { const p=courseSchema.safeParse(req.body); if(!p.success)return void res.status(400).json({error:"Invalid course"});const v=p.data;try{const r=await pool.query<LibraryCourseRow>(`INSERT INTO library_courses (id,title,subtitle,description,category,level,cover_image_url,status,display_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[v.id,v.title,v.subtitle,v.description,v.category,v.level,v.coverImageUrl,v.status,v.displayOrder]);res.status(201).json({data:serializeCourse(r.rows[0])});}catch(e){if((e as {code?:string}).code==="23505")return void res.status(409).json({error:"Course id already exists"});next(e);}});
libraryRouter.patch("/courses/:courseId", requireAdmin, async(req,res,next)=>{const id=idSchema.safeParse(req.params.courseId),p=courseUpdateSchema.safeParse(req.body);if(!id.success||!p.success)return void res.status(400).json({error:"Invalid course update"});try{const c=await pool.query<LibraryCourseRow>("SELECT * FROM library_courses WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Course not found"});const v={...serializeCourse(c.rows[0]),...p.data};const r=await pool.query<LibraryCourseRow>(`UPDATE library_courses SET title=$2,subtitle=$3,description=$4,category=$5,level=$6,cover_image_url=$7,status=$8,display_order=$9,updated_at=NOW() WHERE id=$1 RETURNING *`,[id.data,v.title,v.subtitle,v.description,v.category,v.level,v.coverImageUrl,v.status,v.displayOrder]);res.json({data:serializeCourse(r.rows[0])});}catch(e){next(e);}});
libraryRouter.post("/course-modules",requireAdmin,async(req,res,next)=>{const p=moduleSchema.safeParse(req.body);if(!p.success)return void res.status(400).json({error:"Invalid module"});const v=p.data;try{const r=await pool.query<LibraryModuleRow>(`INSERT INTO library_course_modules (id,course_id,title,description,status,display_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[v.id,v.courseId,v.title,v.description,v.status,v.displayOrder]);res.status(201).json({data:serializeModule(r.rows[0])});}catch(e){if((e as {code?:string}).code==="23505")return void res.status(409).json({error:"Module id already exists"});next(e);}});
libraryRouter.patch("/course-modules/:moduleId",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.moduleId),p=moduleUpdateSchema.safeParse(req.body);if(!id.success||!p.success)return void res.status(400).json({error:"Invalid module update"});try{const c=await pool.query<LibraryModuleRow>("SELECT * FROM library_course_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Module not found"});const v={...serializeModule(c.rows[0]),...p.data};const r=await pool.query<LibraryModuleRow>(`UPDATE library_course_modules SET course_id=$2,title=$3,description=$4,status=$5,display_order=$6,updated_at=NOW() WHERE id=$1 RETURNING *`,[id.data,v.courseId,v.title,v.description,v.status,v.displayOrder]);res.json({data:serializeModule(r.rows[0])});}catch(e){next(e);}});
libraryRouter.post("/chapters",requireAdmin,async(req,res,next)=>{const p=chapterSchema.safeParse(req.body);if(!p.success)return void res.status(400).json({error:"Invalid chapter"});const v=p.data;const mediaType=v.chapterType==="audio"?"audio":v.chapterType==="pdf"?"pdf":"video";try{const r=await pool.query<LibraryChapterRow>(`INSERT INTO library_modules (id,course_id,course_module_id,title,description,classification,chapter_type,interactive_content,media_type,media_url,media_content_type,thumbnail_url,duration_seconds,status,display_order) VALUES ($1,$2,$3,$4,$5,'chapter',$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[v.id,v.courseId,v.moduleId,v.title,v.description,v.chapterType,v.interactiveContent,mediaType,v.mediaUrl,v.mediaContentType,v.thumbnailUrl,v.durationSeconds,v.status,v.displayOrder]);res.status(201).json({data:serializeChapter(r.rows[0])});}catch(e){if((e as {code?:string}).code==="23505")return void res.status(409).json({error:"Chapter id already exists"});next(e);}});
libraryRouter.patch("/chapters/:chapterId", requireAdmin, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.chapterId), parsed = chapterUpdateSchema.safeParse(req.body);
  if (!id.success || !parsed.success) return void res.status(400).json({ error: "Invalid chapter update" });
  try {
    const current = await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1", [id.data]);
    if (!current.rows[0]) return void res.status(404).json({ error: "Chapter not found" });
    const value = { ...serializeChapter(current.rows[0]), ...parsed.data };
    const mediaType = value.chapterType === "audio" ? "audio" : value.chapterType === "pdf" ? "pdf" : "video";
    if (current.rows[0].chapter_type === "video" && value.chapterType !== "video") {
      const attachmentCount = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM library_chapter_attachments WHERE chapter_id=$1", [id.data]);
      if (Number(attachmentCount.rows[0]?.count ?? 0) > 0) return void res.status(409).json({ error: "Delete the video chapter's PDF attachments before changing its type" });
    }
    const mediaChanged = mediaType !== current.rows[0].media_type;
    const row = await pool.query<LibraryChapterRow>(`UPDATE library_modules SET course_id=$2,course_module_id=$3,title=$4,description=$5,chapter_type=$6,interactive_content=$7,media_type=$8,media_object_key=$9,media_url=$10,media_content_type=$11,thumbnail_url=$12,duration_seconds=$13,status=$14,display_order=$15,updated_at=NOW() WHERE id=$1 RETURNING *`, [id.data, value.courseId, value.moduleId, value.title, value.description, value.chapterType, value.interactiveContent, mediaType, mediaChanged ? null : current.rows[0].media_object_key, mediaChanged ? null : value.mediaUrl, mediaChanged ? null : value.mediaContentType, value.thumbnailUrl, mediaChanged ? null : value.durationSeconds, value.status, value.displayOrder]);
    if (mediaChanged && current.rows[0].media_object_key) await deleteObject(current.rows[0].media_object_key).catch(() => undefined);
    res.json({ data: serializeChapter(row.rows[0]) });
  } catch (error) { next(error); }
});

async function removeStoredObjects(keys: Array<string | null>) {
  await Promise.all(keys.filter((key): key is string => Boolean(key)).map((key) => deleteObject(key).catch(() => undefined)));
}

libraryRouter.delete("/courses/:courseId", requireAdmin, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.courseId);
  if (!id.success) return void res.status(400).json({ error: "Invalid course id" });
  try {
    const course = await pool.query<Pick<LibraryCourseRow, "cover_object_key">>("SELECT cover_object_key FROM library_courses WHERE id=$1", [id.data]);
    if (!course.rows[0]) return void res.status(404).json({ error: "Course not found" });
    const media = await pool.query<Pick<LibraryChapterRow, "media_object_key">>("SELECT media_object_key FROM library_modules WHERE course_id=$1", [id.data]);
    const attachments = await pool.query<Pick<LibraryChapterAttachmentRow, "object_key">>("SELECT attachment.object_key FROM library_chapter_attachments attachment JOIN library_modules chapter ON chapter.id=attachment.chapter_id WHERE chapter.course_id=$1", [id.data]);
    await pool.query("DELETE FROM library_courses WHERE id=$1", [id.data]);
    await removeStoredObjects([course.rows[0].cover_object_key, ...media.rows.map((row) => row.media_object_key), ...attachments.rows.map((row) => row.object_key)]);
    res.json({ data: { deleted: true, id: id.data } });
  } catch (error) { next(error); }
});

libraryRouter.delete("/course-modules/:moduleId", requireAdmin, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.moduleId);
  if (!id.success) return void res.status(400).json({ error: "Invalid module id" });
  try {
    const module = await pool.query("SELECT id FROM library_course_modules WHERE id=$1", [id.data]);
    if (!module.rows[0]) return void res.status(404).json({ error: "Module not found" });
    const media = await pool.query<Pick<LibraryChapterRow, "media_object_key">>("SELECT media_object_key FROM library_modules WHERE course_module_id=$1", [id.data]);
    const attachments = await pool.query<Pick<LibraryChapterAttachmentRow, "object_key">>("SELECT attachment.object_key FROM library_chapter_attachments attachment JOIN library_modules chapter ON chapter.id=attachment.chapter_id WHERE chapter.course_module_id=$1", [id.data]);
    await pool.query("DELETE FROM library_course_modules WHERE id=$1", [id.data]);
    await removeStoredObjects([...media.rows.map((row) => row.media_object_key), ...attachments.rows.map((row) => row.object_key)]);
    res.json({ data: { deleted: true, id: id.data } });
  } catch (error) { next(error); }
});

libraryRouter.delete("/chapters/:chapterId", requireAdmin, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.chapterId);
  if (!id.success) return void res.status(400).json({ error: "Invalid chapter id" });
  try {
    const chapter = await pool.query<Pick<LibraryChapterRow, "media_object_key">>("SELECT media_object_key FROM library_modules WHERE id=$1", [id.data]);
    if (!chapter.rows[0]) return void res.status(404).json({ error: "Chapter not found" });
    const attachments = await pool.query<Pick<LibraryChapterAttachmentRow, "object_key">>("SELECT object_key FROM library_chapter_attachments WHERE chapter_id=$1", [id.data]);
    await pool.query("DELETE FROM library_modules WHERE id=$1", [id.data]);
    await removeStoredObjects([chapter.rows[0].media_object_key, ...attachments.rows.map((row) => row.object_key)]);
    res.json({ data: { deleted: true, id: id.data } });
  } catch (error) { next(error); }
});

libraryRouter.post("/courses/:courseId/cover-upload-url",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.courseId),b=imageUploadSchema.safeParse(req.body);if(!id.success||!b.success)return void res.status(400).json({error:"Invalid cover upload"});const ext=b.data.contentType==="image/png"?".png":b.data.contentType==="image/webp"?".webp":".jpg",objectKey=`library/courses/${id.data}/cover-${Date.now()}-${randomUUID()}${ext}`;try{res.json({data:{uploadUrl:await createAssetUploadUrl(objectKey,b.data.contentType),objectKey,expiresInSeconds:900}});}catch(e){next(e);}});
libraryRouter.post("/courses/:courseId/cover-complete",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.courseId),b=z.object({objectKey:z.string().min(1).max(500)}).safeParse(req.body),prefix=`library/courses/${id.success?id.data:""}/`;if(!id.success||!b.success||!b.data.objectKey.startsWith(prefix))return void res.status(400).json({error:"Invalid cover completion"});try{await assertObjectExists(b.data.objectKey);const c=await pool.query<LibraryCourseRow>("SELECT * FROM library_courses WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Course not found"});const r=await pool.query<LibraryCourseRow>("UPDATE library_courses SET cover_object_key=$2,cover_image_url=$3,updated_at=NOW() WHERE id=$1 RETURNING *",[id.data,b.data.objectKey,getPublicObjectUrl(b.data.objectKey)]);if(c.rows[0].cover_object_key&&c.rows[0].cover_object_key!==b.data.objectKey)await deleteObject(c.rows[0].cover_object_key).catch(()=>undefined);res.json({data:serializeCourse(r.rows[0])});}catch(e){next(e);}});
libraryRouter.post("/chapters/:chapterId/media-upload-url",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId),b=mediaUploadSchema.safeParse(req.body);if(!id.success||!b.success)return void res.status(400).json({error:"Invalid media upload"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});const expected=c.rows[0].media_type==="pdf"?"application/pdf":`${c.rows[0].media_type}/`;if(c.rows[0].media_type==="pdf"?b.data.contentType!==expected:!b.data.contentType.startsWith(expected))return void res.status(400).json({error:`Choose a ${c.rows[0].media_type} file`});if(c.rows[0].media_type==="pdf"&&b.data.fileSize>100*1024*1024)return void res.status(400).json({error:"PDF files must be 100 MB or smaller"});const extensions:Record<string,string>={"audio/mpeg":".mp3","audio/mp3":".mp3","audio/mp4":".m4a","audio/x-m4a":".m4a","audio/wav":".wav","audio/webm":".webm","audio/aac":".aac","audio/ogg":".ogg","video/mp4":".mp4","video/quicktime":".mov","video/webm":".webm","application/pdf":".pdf"},objectKey=`library/chapters/${id.data}/${Date.now()}-${randomUUID()}${extensions[b.data.contentType]}`;res.json({data:{uploadUrl:await createAssetUploadUrl(objectKey,b.data.contentType),objectKey,expiresInSeconds:900}});}catch(e){next(e);}});
libraryRouter.post("/chapters/:chapterId/media-complete",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId),b=completeUploadSchema.safeParse(req.body),prefix=`library/chapters/${id.success?id.data:""}/`;if(!id.success||!b.success||!b.data.objectKey.startsWith(prefix)||b.data.objectKey.includes("/attachments/"))return void res.status(400).json({error:"Invalid media completion"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});const expected=c.rows[0].media_type==="pdf"?"application/pdf":`${c.rows[0].media_type}/`;if(c.rows[0].media_type==="pdf"?b.data.contentType!==expected:!b.data.contentType.startsWith(expected))return void res.status(400).json({error:`Choose a ${c.rows[0].media_type} file`});await assertObjectExists(b.data.objectKey);const r=await pool.query<LibraryChapterRow>(`UPDATE library_modules SET media_object_key=$2,media_url=$3,media_content_type=$4,duration_seconds=COALESCE($5,duration_seconds),updated_at=NOW() WHERE id=$1 RETURNING *`,[id.data,b.data.objectKey,getPublicObjectUrl(b.data.objectKey),b.data.contentType,b.data.durationSeconds??null]);if(c.rows[0].media_object_key&&c.rows[0].media_object_key!==b.data.objectKey)await deleteObject(c.rows[0].media_object_key).catch(()=>undefined);res.status(201).json({data:serializeChapter(r.rows[0])});}catch(e){next(e);}});
libraryRouter.delete("/chapters/:chapterId/media",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId);if(!id.success)return void res.status(400).json({error:"Invalid chapter id"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});if(c.rows[0].media_object_key)await deleteObject(c.rows[0].media_object_key);const r=await pool.query<LibraryChapterRow>("UPDATE library_modules SET media_object_key=NULL,media_url=NULL,media_content_type=NULL,updated_at=NOW() WHERE id=$1 RETURNING *",[id.data]);res.json({data:serializeChapter(r.rows[0])});}catch(e){next(e);}});

libraryRouter.post("/chapters/:chapterId/pdf-attachments/upload-url", requireAdmin, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.chapterId), body = attachmentUploadSchema.safeParse(req.body);
  if (!id.success || !body.success) return void res.status(400).json({ error: "Choose a PDF smaller than 100 MB" });
  try {
    const chapter = await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1", [id.data]);
    if (!chapter.rows[0]) return void res.status(404).json({ error: "Chapter not found" });
    if (chapter.rows[0].chapter_type !== "video") return void res.status(400).json({ error: "PDF attachments can only be added to video chapters" });
    const objectKey = `library/chapters/${id.data}/attachments/${Date.now()}-${randomUUID()}.pdf`;
    res.json({ data: { uploadUrl: await createAssetUploadUrl(objectKey, body.data.contentType), objectKey, expiresInSeconds: 900 } });
  } catch (error) { next(error); }
});

libraryRouter.post("/chapters/:chapterId/pdf-attachments/complete", requireAdmin, async (req, res, next) => {
  const id = idSchema.safeParse(req.params.chapterId), body = attachmentCompleteSchema.safeParse(req.body);
  const prefix = `library/chapters/${id.success ? id.data : ""}/attachments/`;
  if (!id.success || !body.success || !body.data.objectKey.startsWith(prefix)) return void res.status(400).json({ error: "Invalid PDF attachment completion" });
  try {
    const chapter = await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1", [id.data]);
    if (!chapter.rows[0]) return void res.status(404).json({ error: "Chapter not found" });
    if (chapter.rows[0].chapter_type !== "video") return void res.status(400).json({ error: "PDF attachments can only be added to video chapters" });
    await assertObjectExists(body.data.objectKey);
    const row = await pool.query<LibraryChapterAttachmentRow>(`INSERT INTO library_chapter_attachments (chapter_id,title,object_key,file_url,content_type,file_size,display_order) VALUES ($1,$2,$3,$4,'application/pdf',$5,$6) RETURNING *`, [id.data, body.data.title, body.data.objectKey, getPublicObjectUrl(body.data.objectKey), body.data.fileSize, body.data.displayOrder]);
    res.status(201).json({ data: serializeAttachment(row.rows[0]) });
  } catch (error) { next(error); }
});

libraryRouter.patch("/chapters/:chapterId/pdf-attachments/:attachmentId", requireAdmin, async (req, res, next) => {
  const chapterId = idSchema.safeParse(req.params.chapterId), attachmentId = z.string().uuid().safeParse(req.params.attachmentId), body = attachmentUpdateSchema.safeParse(req.body);
  if (!chapterId.success || !attachmentId.success || !body.success) return void res.status(400).json({ error: "Invalid PDF attachment update" });
  try {
    const current = await pool.query<LibraryChapterAttachmentRow>("SELECT * FROM library_chapter_attachments WHERE id=$1 AND chapter_id=$2", [attachmentId.data, chapterId.data]);
    if (!current.rows[0]) return void res.status(404).json({ error: "PDF attachment not found" });
    const title = body.data.title ?? current.rows[0].title, displayOrder = body.data.displayOrder ?? current.rows[0].display_order;
    const row = await pool.query<LibraryChapterAttachmentRow>("UPDATE library_chapter_attachments SET title=$3,display_order=$4,updated_at=NOW() WHERE id=$1 AND chapter_id=$2 RETURNING *", [attachmentId.data, chapterId.data, title, displayOrder]);
    res.json({ data: serializeAttachment(row.rows[0]) });
  } catch (error) { next(error); }
});

libraryRouter.delete("/chapters/:chapterId/pdf-attachments/:attachmentId", requireAdmin, async (req, res, next) => {
  const chapterId = idSchema.safeParse(req.params.chapterId), attachmentId = z.string().uuid().safeParse(req.params.attachmentId);
  if (!chapterId.success || !attachmentId.success) return void res.status(400).json({ error: "Invalid PDF attachment id" });
  try {
    const row = await pool.query<LibraryChapterAttachmentRow>("SELECT * FROM library_chapter_attachments WHERE id=$1 AND chapter_id=$2", [attachmentId.data, chapterId.data]);
    if (!row.rows[0]) return void res.status(404).json({ error: "PDF attachment not found" });
    await pool.query("DELETE FROM library_chapter_attachments WHERE id=$1", [attachmentId.data]);
    await deleteObject(row.rows[0].object_key).catch(() => undefined);
    res.json({ data: { deleted: true, id: attachmentId.data } });
  } catch (error) { next(error); }
});
