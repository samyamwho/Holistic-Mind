import { API_URL } from "../../config/environment";
import type { LibraryCourse } from "../../data/libraryCatalog";

function normalizeAssetUrl(value: string | null) {
  if (!value || !API_URL) return value;
  try {
    const assetUrl = new URL(value);
    const apiUrl = new URL(API_URL);
    if (assetUrl.hostname === "localhost" || assetUrl.hostname === "127.0.0.1") {
      assetUrl.hostname = apiUrl.hostname;
    }
    return assetUrl.toString();
  } catch {
    return value;
  }
}

function normalizeCourse(course: LibraryCourse): LibraryCourse {
  return {
    ...course,
    coverImageUrl: normalizeAssetUrl(course.coverImageUrl),
    modules: course.modules.map((module) => ({
      ...module,
      chapters: module.chapters.map((chapter) => ({
        ...chapter,
        mediaUrl: normalizeAssetUrl(chapter.mediaUrl),
        thumbnailUrl: normalizeAssetUrl(chapter.thumbnailUrl),
        attachments: (chapter.attachments ?? []).map((attachment) => ({
          ...attachment,
          url: normalizeAssetUrl(attachment.url) ?? attachment.url,
        })),
      })),
    })),
  };
}

function validateCourse(value: unknown): value is LibraryCourse {
  if (!value || typeof value !== "object") return false;
  const course = value as Partial<LibraryCourse>;
  return typeof course.id === "string" && typeof course.title === "string" && Array.isArray(course.modules);
}

export async function getLibraryCourses(signal?: AbortSignal) {
  if (!API_URL) throw new Error("Backend API is not configured");
  const response = await fetch(`${API_URL}/api/library?fresh=${Date.now()}`, {
    signal,
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Library request failed with ${response.status}`);
  const payload = (await response.json()) as { data?: unknown[] };
  if (!Array.isArray(payload.data)) throw new Error("Library response is invalid");
  return payload.data.filter(validateCourse).map(normalizeCourse);
}

export async function getLibraryCourse(courseId: string, signal?: AbortSignal) {
  if (!API_URL) throw new Error("Backend API is not configured");
  const response = await fetch(`${API_URL}/api/library/${encodeURIComponent(courseId)}?fresh=${Date.now()}`, {
    signal,
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) throw new Error(`Course request failed with ${response.status}`);
  const payload = (await response.json()) as { data?: unknown };
  if (!validateCourse(payload.data)) throw new Error("Course response is invalid");
  return normalizeCourse(payload.data);
}
