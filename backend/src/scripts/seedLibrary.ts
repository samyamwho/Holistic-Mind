import { readFile } from "node:fs/promises";
import { pool } from "../db.js";

type CourseSeed = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  category: string;
  level: "all_levels" | "beginner" | "intermediate" | "advanced";
  status: "draft" | "published" | "archived";
  displayOrder: number;
};

type ModuleSeed = {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  status: "draft" | "published" | "archived";
  displayOrder: number;
};

type ChapterSeed = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description?: string;
  mediaType: "audio" | "video";
  chapterType?: "audio" | "video" | "interactive_qna" | "mcq";
  interactiveContent?: Record<string, unknown>;
  durationSeconds?: number;
  status: "draft" | "published" | "archived";
  displayOrder: number;
};

const seedUrl = new URL("../data/library.json", import.meta.url);
const seed = JSON.parse(await readFile(seedUrl, "utf8")) as { courses: CourseSeed[]; modules: ModuleSeed[]; chapters: ChapterSeed[] };

try {
  await pool.query("BEGIN");
  for (const course of seed.courses) {
    await pool.query(
      `INSERT INTO library_courses (id, title, subtitle, description, category, level, status, display_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle,
       description=EXCLUDED.description, category=EXCLUDED.category, level=EXCLUDED.level,
       status=EXCLUDED.status, display_order=EXCLUDED.display_order, updated_at=NOW()`,
      [course.id, course.title, course.subtitle ?? null, course.description ?? null, course.category, course.level, course.status, course.displayOrder]
    );
  }
  for (const module of seed.modules) {
    await pool.query(
      `INSERT INTO library_course_modules (id, course_id, title, description, status, display_order)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET course_id=EXCLUDED.course_id, title=EXCLUDED.title,
       description=EXCLUDED.description, status=EXCLUDED.status, display_order=EXCLUDED.display_order, updated_at=NOW()`,
      [module.id, module.courseId, module.title, module.description ?? null, module.status, module.displayOrder]
    );
  }
  for (const chapter of seed.chapters) {
    await pool.query(
      `INSERT INTO library_modules (id, course_id, course_module_id, title, description, classification, chapter_type, interactive_content, media_type, duration_seconds, status, display_order)
       VALUES ($1,$2,$3,$4,$5,'chapter',$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET course_id=EXCLUDED.course_id, course_module_id=EXCLUDED.course_module_id,
       title=EXCLUDED.title, description=EXCLUDED.description, classification='chapter', chapter_type=EXCLUDED.chapter_type,
       interactive_content=EXCLUDED.interactive_content, media_type=EXCLUDED.media_type,
       duration_seconds=EXCLUDED.duration_seconds, status=EXCLUDED.status, display_order=EXCLUDED.display_order, updated_at=NOW()`,
      [chapter.id, chapter.courseId, chapter.moduleId, chapter.title, chapter.description ?? null,
       chapter.chapterType ?? chapter.mediaType, chapter.interactiveContent ?? {}, chapter.mediaType,
       chapter.durationSeconds ?? null, chapter.status, chapter.displayOrder]
    );
  }
  await pool.query("COMMIT");
  console.log(`Seeded ${seed.courses.length} course, ${seed.modules.length} modules, and ${seed.chapters.length} chapters.`);
} catch (error) {
  await pool.query("ROLLBACK");
  throw error;
} finally {
  await pool.end();
}
