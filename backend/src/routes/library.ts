import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { pool, type LibraryChapterRow, type LibraryCourseRow, type LibraryModuleRow } from "../db.js";
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
  chapterType: z.enum(["audio", "video", "interactive_qna", "mcq"]).default("video"),
  interactiveContent: z.record(z.string(), z.unknown()).default({}),
  mediaType: z.enum(["audio", "video"]).default("video"),
  mediaUrl: z.url().nullable().default(null), mediaContentType: z.string().trim().max(100).nullable().default(null),
  thumbnailUrl: z.url().nullable().default(null), durationSeconds: z.number().int().positive().nullable().default(null),
  status: statusSchema.default("draft"), displayOrder: z.number().int().min(0).default(0),
});
const courseUpdateSchema = courseSchema.omit({ id: true }).partial().refine((v) => Object.keys(v).length > 0);
const moduleUpdateSchema = moduleSchema.omit({ id: true }).partial().refine((v) => Object.keys(v).length > 0);
const chapterUpdateSchema = chapterSchema.omit({ id: true }).partial().refine((v) => Object.keys(v).length > 0);
const imageUploadSchema = z.object({ fileName: z.string().min(1).max(180), contentType: z.enum(["image/jpeg", "image/png", "image/webp"]) });
const mediaContentTypeSchema = z.enum(["audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "audio/aac", "audio/ogg", "video/mp4", "video/quicktime", "video/webm"]);
const mediaUploadSchema = z.object({ fileName: z.string().min(1).max(180), contentType: mediaContentTypeSchema, fileSize: z.number().int().positive().max(500 * 1024 * 1024) });
const completeUploadSchema = z.object({ objectKey: z.string().min(1).max(500), contentType: mediaContentTypeSchema, durationSeconds: z.number().int().positive().optional() });

function serializeChapter(row: LibraryChapterRow) {
  return { id: row.id, courseId: row.course_id, moduleId: row.course_module_id, title: row.title, description: row.description,
    chapterType: row.chapter_type, interactiveContent: row.interactive_content, mediaType: row.media_type,
    mediaUrl: row.media_url, mediaContentType: row.media_content_type, thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds, status: row.status, displayOrder: row.display_order };
}
function serializeModule(row: LibraryModuleRow, chapters: LibraryChapterRow[] = []) {
  return { id: row.id, courseId: row.course_id, title: row.title, description: row.description, status: row.status,
    displayOrder: row.display_order, chapters: chapters.map(serializeChapter) };
}
function serializeCourse(row: LibraryCourseRow, modules: ReturnType<typeof serializeModule>[] = []) {
  return { id: row.id, title: row.title, subtitle: row.subtitle, description: row.description, category: row.category,
    level: row.level, coverImageUrl: row.cover_image_url, status: row.status, displayOrder: row.display_order, modules };
}
async function listCourses(includeUnpublished: boolean) {
  const courseFilter = includeUnpublished ? "" : "WHERE status = 'published'";
  const chapterFilter = includeUnpublished ? "WHERE course_module_id IS NOT NULL" : "WHERE status = 'published' AND course_module_id IS NOT NULL";
  const [courses, modules, chapters] = await Promise.all([
    pool.query<LibraryCourseRow>(`SELECT * FROM library_courses ${courseFilter} ORDER BY display_order, title`),
    pool.query<LibraryModuleRow>(`SELECT * FROM library_course_modules ${courseFilter} ORDER BY display_order, title`),
    pool.query<LibraryChapterRow>(`SELECT * FROM library_modules ${chapterFilter} ORDER BY display_order, title`),
  ]);
  const chaptersByModule = new Map<string, LibraryChapterRow[]>();
  for (const chapter of chapters.rows) {
    const items = chaptersByModule.get(chapter.course_module_id) ?? [];
    items.push(chapter); chaptersByModule.set(chapter.course_module_id, items);
  }
  const modulesByCourse = new Map<string, ReturnType<typeof serializeModule>[]>();
  for (const module of modules.rows) {
    const items = modulesByCourse.get(module.course_id) ?? [];
    items.push(serializeModule(module, chaptersByModule.get(module.id) ?? [])); modulesByCourse.set(module.course_id, items);
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
libraryRouter.post("/chapters",requireAdmin,async(req,res,next)=>{const p=chapterSchema.safeParse(req.body);if(!p.success)return void res.status(400).json({error:"Invalid chapter"});const v=p.data;const mediaType=v.chapterType==="audio"?"audio":"video";try{const r=await pool.query<LibraryChapterRow>(`INSERT INTO library_modules (id,course_id,course_module_id,title,description,classification,chapter_type,interactive_content,media_type,media_url,media_content_type,thumbnail_url,duration_seconds,status,display_order) VALUES ($1,$2,$3,$4,$5,'chapter',$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,[v.id,v.courseId,v.moduleId,v.title,v.description,v.chapterType,v.interactiveContent,mediaType,v.mediaUrl,v.mediaContentType,v.thumbnailUrl,v.durationSeconds,v.status,v.displayOrder]);res.status(201).json({data:serializeChapter(r.rows[0])});}catch(e){if((e as {code?:string}).code==="23505")return void res.status(409).json({error:"Chapter id already exists"});next(e);}});
libraryRouter.patch("/chapters/:chapterId",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId),p=chapterUpdateSchema.safeParse(req.body);if(!id.success||!p.success)return void res.status(400).json({error:"Invalid chapter update"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});const v={...serializeChapter(c.rows[0]),...p.data};const mediaType=v.chapterType==="audio"?"audio":"video";const r=await pool.query<LibraryChapterRow>(`UPDATE library_modules SET course_id=$2,course_module_id=$3,title=$4,description=$5,chapter_type=$6,interactive_content=$7,media_type=$8,media_url=$9,media_content_type=$10,thumbnail_url=$11,duration_seconds=$12,status=$13,display_order=$14,updated_at=NOW() WHERE id=$1 RETURNING *`,[id.data,v.courseId,v.moduleId,v.title,v.description,v.chapterType,v.interactiveContent,mediaType,v.mediaUrl,v.mediaContentType,v.thumbnailUrl,v.durationSeconds,v.status,v.displayOrder]);res.json({data:serializeChapter(r.rows[0])});}catch(e){next(e);}});

libraryRouter.post("/courses/:courseId/cover-upload-url",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.courseId),b=imageUploadSchema.safeParse(req.body);if(!id.success||!b.success)return void res.status(400).json({error:"Invalid cover upload"});const ext=b.data.contentType==="image/png"?".png":b.data.contentType==="image/webp"?".webp":".jpg",objectKey=`library/courses/${id.data}/cover-${Date.now()}-${randomUUID()}${ext}`;try{res.json({data:{uploadUrl:await createAssetUploadUrl(objectKey,b.data.contentType),objectKey,expiresInSeconds:900}});}catch(e){next(e);}});
libraryRouter.post("/courses/:courseId/cover-complete",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.courseId),b=z.object({objectKey:z.string().min(1).max(500)}).safeParse(req.body),prefix=`library/courses/${id.success?id.data:""}/`;if(!id.success||!b.success||!b.data.objectKey.startsWith(prefix))return void res.status(400).json({error:"Invalid cover completion"});try{await assertObjectExists(b.data.objectKey);const c=await pool.query<LibraryCourseRow>("SELECT * FROM library_courses WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Course not found"});const r=await pool.query<LibraryCourseRow>("UPDATE library_courses SET cover_object_key=$2,cover_image_url=$3,updated_at=NOW() WHERE id=$1 RETURNING *",[id.data,b.data.objectKey,getPublicObjectUrl(b.data.objectKey)]);if(c.rows[0].cover_object_key&&c.rows[0].cover_object_key!==b.data.objectKey)await deleteObject(c.rows[0].cover_object_key).catch(()=>undefined);res.json({data:serializeCourse(r.rows[0])});}catch(e){next(e);}});
libraryRouter.post("/chapters/:chapterId/media-upload-url",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId),b=mediaUploadSchema.safeParse(req.body);if(!id.success||!b.success)return void res.status(400).json({error:"Invalid media upload"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});if(!b.data.contentType.startsWith(`${c.rows[0].media_type}/`))return void res.status(400).json({error:`Choose a ${c.rows[0].media_type} file`});const extensions:Record<string,string>={"audio/mpeg":".mp3","audio/mp3":".mp3","audio/mp4":".m4a","audio/x-m4a":".m4a","audio/wav":".wav","audio/webm":".webm","audio/aac":".aac","audio/ogg":".ogg","video/mp4":".mp4","video/quicktime":".mov","video/webm":".webm"},objectKey=`library/chapters/${id.data}/${Date.now()}-${randomUUID()}${extensions[b.data.contentType]}`;res.json({data:{uploadUrl:await createAssetUploadUrl(objectKey,b.data.contentType),objectKey,expiresInSeconds:900}});}catch(e){next(e);}});
libraryRouter.post("/chapters/:chapterId/media-complete",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId),b=completeUploadSchema.safeParse(req.body),prefix=`library/chapters/${id.success?id.data:""}/`;if(!id.success||!b.success||!b.data.objectKey.startsWith(prefix))return void res.status(400).json({error:"Invalid media completion"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});await assertObjectExists(b.data.objectKey);const r=await pool.query<LibraryChapterRow>(`UPDATE library_modules SET media_object_key=$2,media_url=$3,media_content_type=$4,duration_seconds=COALESCE($5,duration_seconds),updated_at=NOW() WHERE id=$1 RETURNING *`,[id.data,b.data.objectKey,getPublicObjectUrl(b.data.objectKey),b.data.contentType,b.data.durationSeconds??null]);if(c.rows[0].media_object_key&&c.rows[0].media_object_key!==b.data.objectKey)await deleteObject(c.rows[0].media_object_key).catch(()=>undefined);res.status(201).json({data:serializeChapter(r.rows[0])});}catch(e){next(e);}});
libraryRouter.delete("/chapters/:chapterId/media",requireAdmin,async(req,res,next)=>{const id=idSchema.safeParse(req.params.chapterId);if(!id.success)return void res.status(400).json({error:"Invalid chapter id"});try{const c=await pool.query<LibraryChapterRow>("SELECT * FROM library_modules WHERE id=$1",[id.data]);if(!c.rows[0])return void res.status(404).json({error:"Chapter not found"});if(c.rows[0].media_object_key)await deleteObject(c.rows[0].media_object_key);const r=await pool.query<LibraryChapterRow>("UPDATE library_modules SET media_object_key=NULL,media_url=NULL,media_content_type=NULL,updated_at=NOW() WHERE id=$1 RETURNING *",[id.data]);res.json({data:serializeChapter(r.rows[0])});}catch(e){next(e);}});
