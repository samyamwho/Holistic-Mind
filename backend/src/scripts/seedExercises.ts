import { readFile } from "node:fs/promises";
import { pool } from "../db.js";

type SeedExercise = {
  id: string;
  title: string;
  category: string;
  guidanceType: string;
  sourcePage: number;
  exerciseId?: string;
};

const seedUrl = new URL("../data/exercises.json", import.meta.url);
const exercises = JSON.parse(await readFile(seedUrl, "utf8")) as SeedExercise[];
const client = await pool.connect();

try {
  await client.query("BEGIN");
  for (const [displayOrder, exercise] of exercises.entries()) {
    await client.query(
      `INSERT INTO exercises (id, title, category, guidance_type, source_page, linked_exercise_id, display_order, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'published')
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, category=EXCLUDED.category, guidance_type=EXCLUDED.guidance_type,
         source_page=EXCLUDED.source_page, linked_exercise_id=EXCLUDED.linked_exercise_id,
         display_order=EXCLUDED.display_order, updated_at=NOW()`,
      [exercise.id, exercise.title, exercise.category, exercise.guidanceType,
       exercise.sourcePage, exercise.exerciseId ?? null, displayOrder]
    );
  }
  await client.query("COMMIT");
  console.log(`Seeded ${exercises.length} exercises.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
