import { useEffect, useMemo, useState } from "react";
import { deleteExerciseVideo, getExerciseVideo, listExercises, updateExercise, uploadExerciseImage, uploadExerciseVideo, type Exercise, type ExerciseMedia } from "./api";

const categories = ["Nervous System Reset", "Breathwork", "Whole Body", "Hip & Pelvic", "Spine & Core", "Upper Body", "Sensory Regulation", "Ancient Practices", "Kundalini Yoga", "For Children", "Headache Relief"];
const guidanceTypes = ["breathing", "video", "guided", "grounding", "audio"] as const;

export default function App() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("hm-admin-key") || "");
  const [keyDraft, setKeyDraft] = useState(adminKey);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Exercise | null>(null);
  const [query, setQuery] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [video, setVideo] = useState<ExerciseMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async (key = adminKey) => {
    setBusy(true); setMessage("");
    try {
      const items = await listExercises(key);
      setExercises(items);
      const nextId = selectedId || items[0]?.id || "";
      setSelectedId(nextId);
      const selected = items.find((item) => item.id === nextId) || null;
      setDraft(selected);
      setVideo(null);
      if (selected?.exerciseId) getExerciseVideo(selected.exerciseId).then(setVideo).catch(() => setVideo(null));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load exercises");
      throw error;
    } finally { setBusy(false); }
  };

  useEffect(() => { if (adminKey) load().catch(() => undefined); }, [adminKey]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return exercises.filter((item) => !term || item.title.toLowerCase().includes(term) || item.category.toLowerCase().includes(term));
  }, [exercises, query]);

  const signIn = () => {
    const key = keyDraft.trim();
    if (!key) return;
    sessionStorage.setItem("hm-admin-key", key);
    setAdminKey(key);
  };

  const signOut = () => {
    sessionStorage.removeItem("hm-admin-key");
    setAdminKey(""); setKeyDraft(""); setExercises([]); setDraft(null); setMessage("");
  };

  const select = (item: Exercise) => {
    setSelectedId(item.id); setDraft({ ...item }); setImageFile(null); setVideoFile(null); setVideo(null); setMessage("");
    if (item.exerciseId) getExerciseVideo(item.exerciseId).then(setVideo).catch(() => setVideo(null));
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true); setMessage("");
    try {
      let saved = await updateExercise(adminKey, draft.id, {
        title: draft.title, category: draft.category, guidanceType: draft.guidanceType,
        sourcePage: Number(draft.sourcePage), exerciseId: draft.exerciseId || null,
        description: draft.description || null, status: draft.status,
        displayOrder: Number(draft.displayOrder), recommendationTags: draft.recommendationTags,
      });
      if (imageFile) saved = await uploadExerciseImage(adminKey, draft.id, imageFile);
      if (videoFile && saved.guidanceType === "video" && saved.exerciseId) {
        setVideo(await uploadExerciseVideo(adminKey, saved.exerciseId, videoFile));
      }
      setExercises((items) => items.map((item) => item.id === saved.id ? saved : item));
      setDraft(saved); setImageFile(null); setVideoFile(null); setMessage("Changes saved successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save changes"); }
    finally { setBusy(false); }
  };

  const removeVideo = async () => {
    if (!draft?.exerciseId || !video || !window.confirm("Delete this demonstration video? This cannot be undone.")) return;
    setBusy(true); setMessage("");
    try {
      await deleteExerciseVideo(adminKey, draft.exerciseId);
      setVideo(null); setVideoFile(null); setMessage("Video deleted successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete video"); }
    finally { setBusy(false); }
  };

  if (!adminKey) return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">HM</div>
        <p className="eyebrow">Holistic Mind</p><h1>Exercise admin</h1>
        <p className="muted">Enter the administrator key from <code>backend/.env</code>. It stays only in this browser tab.</p>
        <label>Administrator key<input type="password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && signIn()} placeholder="Paste ADMIN_API_KEY" autoFocus /></label>
        <button className="primary" onClick={signIn}>Open exercise manager</button>
      </section>
    </main>
  );

  return (
    <div className="app-shell">
      <header><div><p className="eyebrow">Holistic Mind</p><h1>Exercise library</h1></div><div className="header-actions"><span>{exercises.length} exercises</span><button className="quiet" onClick={() => load().catch(() => undefined)}>Refresh</button><button className="quiet" onClick={signOut}>Lock</button></div></header>
      <div className="workspace">
        <aside>
          <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search exercises…" />
          <div className="exercise-list">{filtered.map((item) => <button key={item.id} className={`exercise-item ${selectedId === item.id ? "active" : ""}`} onClick={() => select(item)}><span className={`status-dot ${item.status}`} /><span><strong>{item.title}</strong><small>{item.category}</small></span></button>)}</div>
        </aside>
        <main className="editor">
          {draft ? <>
            <div className="editor-heading"><div><p className="eyebrow">Edit exercise</p><h2>{draft.title}</h2><code>{draft.id}</code></div><button className="primary save" disabled={busy || !draft.title.trim()} onClick={save}>{busy ? "Saving…" : "Save changes"}</button></div>
            {message && <div className={message.includes("successfully") ? "notice success" : "notice error"}>{message}</div>}
            <section className="panel image-panel">
              <div className="image-preview">{imageFile ? <img src={URL.createObjectURL(imageFile)} /> : draft.imageUrl ? <img src={draft.imageUrl} /> : <span>No image yet</span>}</div>
              <div><h3>Exercise image</h3><p className="muted">Square WebP, PNG, or JPEG works best. Maximum recommended size: 3 MB.</p><label className="file-button">Choose image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>{imageFile && <small>{imageFile.name}</small>}</div>
            </section>
            <section className="panel image-panel">
              <div className="video-preview">{videoFile ? <video src={URL.createObjectURL(videoFile)} controls /> : video ? <video src={video.videoUrl} controls /> : <span>No video uploaded</span>}</div>
              <div><h3>Demonstration video</h3>{draft.guidanceType !== "video" ? <p className="muted">This exercise does not require a video. Change Guidance type to video only if you want to add one.</p> : draft.exerciseId ? <><p className="muted">Upload MP4, MOV, or WebM. A new upload replaces the previous video.</p><div className="media-actions"><label className="file-button">Choose video<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} /></label>{video && <button className="danger" type="button" disabled={busy} onClick={removeVideo}>Delete video</button>}</div>{videoFile && <small>{videoFile.name}</small>}{video && !videoFile && <small>Current video is ready</small>}</> : <p className="muted">Set a Linked practice ID and save first. This connects the catalog item to its playable exercise screen.</p>}</div>
            </section>
            <section className="panel form-grid">
              <label className="wide">Name<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
              <label>Category<select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Guidance type<select value={draft.guidanceType} onChange={(e) => setDraft({ ...draft, guidanceType: e.target.value as Exercise["guidanceType"] })}>{guidanceTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label>Status<select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Exercise["status"] })}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
              <label>Display order<input type="number" min="0" value={draft.displayOrder} onChange={(e) => setDraft({ ...draft, displayOrder: Number(e.target.value) })} /></label>
              <label>Source page<input type="number" min="1" value={draft.sourcePage} onChange={(e) => setDraft({ ...draft, sourcePage: Number(e.target.value) })} /></label>
              <label>Linked practice ID<input value={draft.exerciseId || ""} onChange={(e) => setDraft({ ...draft, exerciseId: e.target.value })} placeholder="Optional" /></label>
              <label className="wide">Description<textarea rows={4} value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Add a short description…" /></label>
              <label className="wide">Recommendation tags<input value={draft.recommendationTags.join(", ")} onChange={(e) => setDraft({ ...draft, recommendationTags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} placeholder="Anxious, Overwhelmed, Sleep" /></label>
            </section>
          </> : <div className="empty">Select an exercise to begin.</div>}
        </main>
      </div>
    </div>
  );
}
