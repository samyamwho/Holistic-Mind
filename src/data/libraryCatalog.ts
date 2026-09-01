export type LibraryPdfAttachment = {
  id: string; chapterId: string; title: string; url: string; contentType: "application/pdf";
  fileSize: number | null; displayOrder: number;
};

export type LibraryChapter = {
  id: string; courseId: string; moduleId: string; title: string; description: string | null;
  chapterType: "audio" | "video" | "pdf" | "interactive_qna" | "mcq";
  interactiveContent: { question?: string; answer?: string; options?: string[]; correctOptionIndex?: number; explanation?: string };
  mediaType: "audio" | "video" | "pdf"; mediaUrl: string | null; mediaContentType: string | null;
  thumbnailUrl: string | null; durationSeconds: number | null; status: "published" | "draft" | "archived"; displayOrder: number;
  attachments: LibraryPdfAttachment[];
};

export type LibraryModule = {
  id: string; courseId: string; title: string; description: string | null;
  status: "published" | "draft" | "archived"; displayOrder: number; chapters: LibraryChapter[];
};

export type LibraryCourse = {
  id: string; title: string; subtitle: string | null; description: string | null; category: string;
  level: "all_levels" | "beginner" | "intermediate" | "advanced"; coverImageUrl: string | null;
  status: "published" | "draft" | "archived"; displayOrder: number; modules: LibraryModule[];
};

const chapter = (id: string, moduleId: string, title: string, mediaType: "audio" | "video", durationSeconds: number, displayOrder: number): LibraryChapter => ({
  id, courseId: "foundations-of-nervous-system-care", moduleId, title, description: "A gentle lesson you can return to whenever it feels useful.",
  chapterType: mediaType, interactiveContent: {}, mediaType, mediaUrl: null, mediaContentType: null, thumbnailUrl: null, durationSeconds, status: "published", displayOrder, attachments: [],
});

const interactiveChapter = (id: string, moduleId: string, title: string, chapterType: "interactive_qna" | "mcq", interactiveContent: LibraryChapter["interactiveContent"], displayOrder: number): LibraryChapter => ({
  id, courseId: "foundations-of-nervous-system-care", moduleId, title, description: "A short interactive check for deeper understanding.", chapterType,
  interactiveContent, mediaType: "video", mediaUrl: null, mediaContentType: null, thumbnailUrl: null, durationSeconds: null, status: "published", displayOrder, attachments: [],
});

export const exampleLibraryCourses: LibraryCourse[] = [{
  id: "foundations-of-nervous-system-care", title: "Nervous System Foundations", subtitle: "A gentle place to begin",
  description: "Short lessons and practices for understanding and supporting your nervous system.", category: "Foundations", level: "beginner",
  coverImageUrl: null, status: "published", displayOrder: 0,
  modules: [
    { id: "getting-started", courseId: "foundations-of-nervous-system-care", title: "Getting started", description: "Begin here and move at your own pace.", status: "published", displayOrder: 0, chapters: [chapter("understanding-your-nervous-system", "getting-started", "Understanding your nervous system", "video", 420, 0), chapter("how-to-use-this-course", "getting-started", "How to use this course gently", "audio", 240, 1)] },
    { id: "understanding-regulation", courseId: "foundations-of-nervous-system-care", title: "Understanding regulation", description: "Notice and name what is happening within you.", status: "published", displayOrder: 1, chapters: [chapter("mapping-your-current-state", "understanding-regulation", "Mapping your current state", "video", 660, 0), interactiveChapter("reflection-check-in", "understanding-regulation", "Reflection check-in", "interactive_qna", { question: "What signals tell you that your nervous system needs support?", answer: "You might notice changes in breath, muscle tension, thoughts, energy, or the urge to withdraw. Naming one signal is a useful beginning." }, 1)] },
    { id: "building-a-practice", courseId: "foundations-of-nervous-system-care", title: "Building a practice", description: "Create a rhythm that works in everyday life.", status: "published", displayOrder: 2, chapters: [chapter("grounding-through-the-senses", "building-a-practice", "Grounding through the senses", "audio", 540, 0), chapter("choosing-your-anchor", "building-a-practice", "Choosing a reliable anchor", "audio", 480, 1), chapter("building-a-weekly-rhythm", "building-a-practice", "Building a weekly rhythm", "video", 360, 2), interactiveChapter("choose-a-supportive-anchor", "building-a-practice", "Choose a supportive anchor", "mcq", { question: "Which option is the most supportive anchor?", options: ["The one that feels steady and accessible", "The most difficult practice", "Whatever works for someone else"], correctOptionIndex: 0, explanation: "An anchor is useful when it feels accessible and helps you reconnect with the present." }, 3)] },
  ],
}];
