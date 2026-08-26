export type ExerciseStatus = "draft" | "published" | "archived";
export type Exercise = {
  id: string;
  title: string;
  category: string;
  guidanceType: "breathing" | "video" | "guided" | "grounding" | "audio";
  sourcePage: number;
  exerciseId?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  status: ExerciseStatus;
  displayOrder: number;
  recommendationTags: string[];
  durationSeconds: number | null;
  activationLevel: "down_regulating" | "neutral" | "up_regulating";
  physicalIntensity: "low" | "moderate" | "high";
  supportGoals: string[];
  intendedStates: string[];
  contraindicationTags: string[];
  breathHoldRequired: boolean;
  positionRequired: "any" | "seated" | "standing" | "lying";
  environmentRequirements: string[];
};
export type ExerciseMedia = {
  exerciseId: string;
  videoUrl: string;
  posterUrl: string | null;
  captionsUrl: string | null;
  durationSeconds: number | null;
  status: "ready";
  updatedAt: string;
};
export type ExerciseAudio = {
  exerciseId: string;
  audioUrl: string;
  contentType: string;
  durationSeconds: number | null;
  status: "ready";
  updatedAt: string;
};
export type LibraryChapter = {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  description: string | null;
  chapterType: "audio" | "video" | "interactive_qna" | "mcq";
  interactiveContent: {
    question?: string;
    answer?: string;
    options?: string[];
    correctOptionIndex?: number;
    explanation?: string;
  };
  mediaType: "audio" | "video";
  mediaUrl: string | null;
  mediaContentType: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  status: ExerciseStatus;
  displayOrder: number;
};
export type LibraryModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  status: ExerciseStatus;
  displayOrder: number;
  chapters: LibraryChapter[];
};
export type LibraryCourse = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string;
  level: "all_levels" | "beginner" | "intermediate" | "advanced";
  coverImageUrl: string | null;
  status: ExerciseStatus;
  displayOrder: number;
  modules: LibraryModule[];
};

const localApiUrl = "http://localhost:4000";
const productionApiUrl = "https://backend-production-f2a02.up.railway.app";

export const API_URL = (
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? productionApiUrl : localApiUrl)
).replace(/\/$/, "");

export const API_ENVIRONMENT = API_URL === productionApiUrl
  ? "Railway production"
  : API_URL === localApiUrl
    ? "Local backend"
    : "Custom backend";

async function request<T>(path: string, adminKey: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "content-type": "application/json", "x-admin-key": adminKey, ...options.headers },
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data === undefined) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload.data;
}

async function uploadToStorage(uploadUrl: string, file: File, contentType: string, label: string) {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": contentType },
      body: file,
    });
    if (!response.ok) throw new Error(`${label} upload failed (${response.status}).`);
  } catch (error) {
    if (error instanceof TypeError) {
      const origin = typeof window === "undefined" ? "this admin origin" : window.location.origin;
      throw new Error(`${label} upload was blocked before it reached storage. Allow PUT and Content-Type from ${origin} in the R2 bucket CORS policy.`);
    }
    throw error;
  }
}

export const listExercises = (key: string) => request<Exercise[]>("/api/exercises/admin/all", key);
export const updateExercise = (key: string, id: string, update: Partial<Omit<Exercise, "id">>) =>
  request<Exercise>(`/api/exercises/${encodeURIComponent(id)}`, key, { method: "PATCH", body: JSON.stringify(update) });
export const createExercise = (key: string, exercise: Exercise) =>
  request<Exercise>("/api/exercises", key, { method: "POST", body: JSON.stringify(exercise) });

export async function uploadExerciseImage(key: string, exerciseId: string, file: File) {
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/exercises/${encodeURIComponent(exerciseId)}/image-upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) }
  );
  await uploadToStorage(prepared.uploadUrl, file, file.type, "Image");
  return request<Exercise>(`/api/exercises/${encodeURIComponent(exerciseId)}/image-complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey }),
  });
}

export async function getExerciseVideo(exerciseId: string) {
  const response = await fetch(`${API_URL}/api/exercise-media/${encodeURIComponent(exerciseId)}`);
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({})) as { data?: ExerciseMedia; error?: string };
  if (!response.ok || !payload.data) throw new Error(payload.error || "Unable to load exercise video");
  return payload.data;
}

export async function uploadExerciseVideo(key: string, exerciseId: string, file: File) {
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/exercise-media/${encodeURIComponent(exerciseId)}/upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) }
  );
  await uploadToStorage(prepared.uploadUrl, file, file.type, "Video");
  return request<ExerciseMedia>(`/api/exercise-media/${encodeURIComponent(exerciseId)}/complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey }),
  });
}

export const deleteExerciseVideo = (key: string, exerciseId: string) =>
  request<{ deleted: true }>(`/api/exercise-media/${encodeURIComponent(exerciseId)}`, key, { method: "DELETE" });

export async function getExerciseAudio(exerciseId: string) {
  const response = await fetch(`${API_URL}/api/exercise-audio/${encodeURIComponent(exerciseId)}`);
  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({})) as { data?: ExerciseAudio; error?: string };
  if (!response.ok || !payload.data) throw new Error(payload.error || "Unable to load exercise audio");
  return payload.data;
}

export async function uploadExerciseAudio(key: string, exerciseId: string, file: File, durationSeconds?: number) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const inferredType: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", webm: "audio/webm", ogg: "audio/ogg" };
  const aliases: Record<string, string> = { "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav" };
  const supportedTypes = new Set(["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/webm", "audio/aac", "audio/ogg"]);
  const browserType = aliases[file.type] ?? file.type;
  const contentType = supportedTypes.has(browserType) ? browserType : inferredType[extension ?? ""];
  if (!contentType) throw new Error("Choose an MP3, M4A, AAC, WAV, WebM, or OGG audio file.");
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/exercise-audio/${encodeURIComponent(exerciseId)}/upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }) }
  );
  await uploadToStorage(prepared.uploadUrl, file, contentType, "Audio");
  return request<ExerciseAudio>(`/api/exercise-audio/${encodeURIComponent(exerciseId)}/complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey, contentType, durationSeconds }),
  });
}

export const deleteExerciseAudio = (key: string, exerciseId: string) =>
  request<{ deleted: true }>(`/api/exercise-audio/${encodeURIComponent(exerciseId)}`, key, { method: "DELETE" });

export const listLibraryCourses = (key: string) => request<LibraryCourse[]>("/api/library/admin/all", key);
export const createLibraryCourse = (key: string, course: Omit<LibraryCourse, "modules">) =>
  request<LibraryCourse>("/api/library/courses", key, { method: "POST", body: JSON.stringify(course) });
export const updateLibraryCourse = (key: string, id: string, update: Partial<Omit<LibraryCourse, "id" | "modules">>) =>
  request<LibraryCourse>(`/api/library/courses/${encodeURIComponent(id)}`, key, { method: "PATCH", body: JSON.stringify(update) });
export const deleteLibraryCourse = (key: string, id: string) =>
  request<{ deleted: true; id: string }>(`/api/library/courses/${encodeURIComponent(id)}`, key, { method: "DELETE" });
export const createLibraryModule = (key: string, module: Omit<LibraryModule, "chapters">) =>
  request<LibraryModule>("/api/library/course-modules", key, { method: "POST", body: JSON.stringify(module) });
export const updateLibraryModule = (key: string, id: string, update: Partial<Omit<LibraryModule, "id" | "chapters">>) =>
  request<LibraryModule>(`/api/library/course-modules/${encodeURIComponent(id)}`, key, { method: "PATCH", body: JSON.stringify(update) });
export const deleteLibraryModule = (key: string, id: string) =>
  request<{ deleted: true; id: string }>(`/api/library/course-modules/${encodeURIComponent(id)}`, key, { method: "DELETE" });
export const createLibraryChapter = (key: string, chapter: LibraryChapter) =>
  request<LibraryChapter>("/api/library/chapters", key, { method: "POST", body: JSON.stringify(chapter) });
export const updateLibraryChapter = (key: string, id: string, update: Partial<Omit<LibraryChapter, "id">>) =>
  request<LibraryChapter>(`/api/library/chapters/${encodeURIComponent(id)}`, key, { method: "PATCH", body: JSON.stringify(update) });
export const deleteLibraryChapter = (key: string, id: string) =>
  request<{ deleted: true; id: string }>(`/api/library/chapters/${encodeURIComponent(id)}`, key, { method: "DELETE" });

export async function uploadLibraryCover(key: string, courseId: string, file: File) {
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/library/courses/${encodeURIComponent(courseId)}/cover-upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType: file.type }) }
  );
  await uploadToStorage(prepared.uploadUrl, file, file.type, "Course cover");
  return request<LibraryCourse>(`/api/library/courses/${encodeURIComponent(courseId)}/cover-complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey }),
  });
}

export async function uploadLibraryChapterMedia(key: string, chapterId: string, file: File, durationSeconds?: number) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const inferred: Record<string, string> = {
    mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", ogg: "audio/ogg",
    mp4: "video/mp4", mov: "video/quicktime", webm: file.type.startsWith("audio/") ? "audio/webm" : "video/webm",
  };
  const aliases: Record<string, string> = { "audio/mp3": "audio/mpeg", "audio/x-wav": "audio/wav" };
  const contentType = aliases[file.type] ?? (file.type || inferred[extension ?? ""]);
  if (!contentType) throw new Error("Choose a supported audio or video file.");
  const prepared = await request<{ uploadUrl: string; objectKey: string }>(
    `/api/library/chapters/${encodeURIComponent(chapterId)}/media-upload-url`, key,
    { method: "POST", body: JSON.stringify({ fileName: file.name, contentType, fileSize: file.size }) }
  );
  await uploadToStorage(prepared.uploadUrl, file, contentType, "Chapter media");
  return request<LibraryChapter>(`/api/library/chapters/${encodeURIComponent(chapterId)}/media-complete`, key, {
    method: "POST", body: JSON.stringify({ objectKey: prepared.objectKey, contentType, durationSeconds }),
  });
}
