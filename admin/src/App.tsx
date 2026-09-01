import { useEffect, useMemo, useState } from "react";
import {
  API_ENVIRONMENT,
  API_URL,
  createExercise,
  deleteExerciseAudio,
  deleteExerciseVideo,
  getExerciseAudio,
  getExerciseVideo,
  listExercises,
  updateExercise,
  uploadExerciseAudio,
  uploadExerciseImage,
  uploadExerciseVideo,
  type Exercise,
  type ExerciseAudio,
  type ExerciseMedia,
} from "./api";
import LibraryWorkspace from "./LibraryWorkspace";

const categories = ["Nervous System Reset", "Breathwork", "Whole Body", "Hip & Pelvic", "Spine & Core", "Upper Body", "Sensory Regulation", "Ancient Practices", "Kundalini Yoga", "For Children", "Headache Relief"];
const exerciseGuidanceTypes = ["breathing", "video", "guided", "grounding"] as const;
type Workspace = "exercises" | "audio" | "library";

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

export default function App() {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem("hm-admin-key") || "");
  const [keyDraft, setKeyDraft] = useState(adminKey);
  const [workspace, setWorkspace] = useState<Workspace>("exercises");
  const [items, setItems] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<Exercise | null>(null);
  const [query, setQuery] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [video, setVideo] = useState<ExerciseMedia | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audio, setAudio] = useState<ExerciseAudio | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const belongsToWorkspace = (item: Exercise, target = workspace) => target === "audio" ? item.guidanceType === "audio" : target === "exercises" ? item.guidanceType !== "audio" : false;

  const select = (item: Exercise) => {
    setSelectedId(item.id);
    setDraft({ ...item });
    setImageFile(null);
    setVideoFile(null);
    setAudioFile(null);
    setVideo(null);
    setAudio(null);
    setIsNew(false);
    setMessage("");
    if (!item.exerciseId) return;
    if (item.guidanceType === "audio") getExerciseAudio(item.exerciseId).then(setAudio).catch(() => setAudio(null));
    if (item.guidanceType === "video") getExerciseVideo(item.exerciseId).then(setVideo).catch(() => setVideo(null));
  };

  const load = async (key = adminKey) => {
    setBusy(true);
    setMessage("");
    try {
      const loaded = await listExercises(key);
      setItems(loaded);
      const visible = loaded.filter((item) => belongsToWorkspace(item));
      const selected = visible.find((item) => item.id === selectedId) ?? visible[0] ?? null;
      if (selected) select(selected);
      else { setSelectedId(""); setDraft(null); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load the library");
      throw error;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (adminKey && workspace !== "library") load().catch(() => undefined); }, [adminKey, workspace]);

  const workspaceItems = useMemo(() => items.filter((item) => belongsToWorkspace(item)), [items, workspace]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return workspaceItems.filter((item) => !term || item.title.toLowerCase().includes(term) || item.category.toLowerCase().includes(term));
  }, [query, workspaceItems]);

  const switchWorkspace = (next: Workspace) => {
    if (next === workspace) return;
    setWorkspace(next);
    setQuery("");
    setSelectedId("");
    setDraft(null);
    setMessage("");
  };

  const signIn = () => {
    const key = keyDraft.trim();
    if (!key) return;
    sessionStorage.setItem("hm-admin-key", key);
    setAdminKey(key);
  };

  const signOut = () => {
    sessionStorage.removeItem("hm-admin-key");
    setAdminKey(""); setKeyDraft(""); setItems([]); setDraft(null); setMessage("");
  };

  const beginNewAudio = () => {
    const id = `audio-${Date.now()}`;
    setSelectedId(id); setIsNew(true); setImageFile(null); setVideoFile(null); setAudioFile(null); setVideo(null); setAudio(null); setMessage("");
    setDraft({
      id, title: "New audio recording", category: "Nervous System Reset", guidanceType: "audio", sourcePage: 1,
      exerciseId: id, description: "", imageUrl: null, status: "published", displayOrder: workspaceItems.length + 1,
      recommendationTags: [], durationSeconds: null, activationLevel: "down_regulating", physicalIntensity: "low",
      supportGoals: [], intendedStates: [], contraindicationTags: [], breathHoldRequired: false,
      positionRequired: "any", environmentRequirements: ["quiet_space"],
    });
  };

  const save = async () => {
    if (!draft) return;
    if (workspace === "audio" && draft.status === "published" && !audio && !audioFile) {
      setMessage("Choose an audio file before publishing this recording.");
      return;
    }
    setBusy(true); setMessage("");
    let detailsSaved = false;
    try {
      const values = {
        title: draft.title, category: draft.category,
        guidanceType: workspace === "audio" ? "audio" as const : draft.guidanceType,
        sourcePage: Number(draft.sourcePage), exerciseId: draft.exerciseId || null,
        description: draft.description || null, status: draft.status,
        displayOrder: Number(draft.displayOrder), recommendationTags: draft.recommendationTags,
        durationSeconds: draft.durationSeconds ? Number(draft.durationSeconds) : null,
        activationLevel: draft.activationLevel, physicalIntensity: draft.physicalIntensity,
        supportGoals: draft.supportGoals, intendedStates: draft.intendedStates,
        contraindicationTags: draft.contraindicationTags, breathHoldRequired: draft.breathHoldRequired,
        positionRequired: draft.positionRequired, environmentRequirements: draft.environmentRequirements,
      };
      const syncSavedExercise = (savedExercise: Exercise) => {
        setItems((current) => current.some((item) => item.id === savedExercise.id)
          ? current.map((item) => item.id === savedExercise.id ? savedExercise : item)
          : [...current, savedExercise]);
        setDraft(savedExercise);
        setIsNew(false);
      };
      let saved = isNew ? await createExercise(adminKey, { ...draft, ...values }) : await updateExercise(adminKey, draft.id, values);
      detailsSaved = true;
      syncSavedExercise(saved);
      if (workspace === "audio" && imageFile) {
        saved = await uploadExerciseImage(adminKey, draft.id, imageFile);
        syncSavedExercise(saved);
      }
      if (workspace === "exercises" && videoFile && saved.guidanceType === "video" && saved.exerciseId) setVideo(await uploadExerciseVideo(adminKey, saved.exerciseId, videoFile));
      if (workspace === "audio" && audioFile && saved.exerciseId) setAudio(await uploadExerciseAudio(adminKey, saved.exerciseId, audioFile, saved.durationSeconds ?? undefined));
      syncSavedExercise(saved);
      setImageFile(null); setVideoFile(null); setAudioFile(null);
      setMessage(workspace === "audio" ? "Audio library updated successfully." : "Exercise updated successfully.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to save changes";
      setMessage(detailsSaved ? `Details were saved, but the media step failed. ${detail}` : detail);
    } finally { setBusy(false); }
  };

  const removeVideo = async () => {
    if (!draft?.exerciseId || !video || !window.confirm("Delete this demonstration video? This cannot be undone.")) return;
    setBusy(true); setMessage("");
    try { await deleteExerciseVideo(adminKey, draft.exerciseId); setVideo(null); setVideoFile(null); setMessage("Video deleted successfully."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete video"); }
    finally { setBusy(false); }
  };

  const removeAudio = async () => {
    if (!draft?.exerciseId || !audio || !window.confirm("Delete this audio recording? This cannot be undone.")) return;
    setBusy(true); setMessage("");
    try { await deleteExerciseAudio(adminKey, draft.exerciseId); setAudio(null); setAudioFile(null); setMessage("Audio deleted successfully."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete audio"); }
    finally { setBusy(false); }
  };

  if (!adminKey) return <main className="login-page"><section className="login-card">
    <div className="brand-mark">HM</div><p className="eyebrow">Holistic Mind</p><h1>Content admin</h1>
    <p className="muted">Enter the production <code>ADMIN_API_KEY</code> from Railway. It stays only in this browser tab.</p>
    <p className="api-target"><strong>{API_ENVIRONMENT}</strong><span>{API_URL}</span></p>
    <label>Administrator key<input type="password" value={keyDraft} onChange={(event) => setKeyDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && signIn()} placeholder="Paste ADMIN_API_KEY" autoFocus /></label>
    <button className="primary" onClick={signIn}>Open content manager</button>
  </section></main>;

  if (workspace === "library") return <LibraryWorkspace adminKey={adminKey} onSwitch={switchWorkspace} onSignOut={signOut} />;

  const isAudioWorkspace = workspace === "audio";

  return <div className="app-shell">
    <header>
      <div><p className="eyebrow">Holistic Mind</p><h1>{isAudioWorkspace ? "Audio library" : "Exercise library"}</h1></div>
      <nav className="library-nav" aria-label="Content workspace">
        <button className={!isAudioWorkspace ? "active" : ""} onClick={() => switchWorkspace("exercises")}><span>Exercises</span><small>{items.filter((item) => item.guidanceType !== "audio").length}</small></button>
        <button className={isAudioWorkspace ? "active" : ""} onClick={() => switchWorkspace("audio")}><span>Audio</span><small>{items.filter((item) => item.guidanceType === "audio").length}</small></button>
        <button onClick={() => switchWorkspace("library")}><span>Curriculum</span></button>
      </nav>
      <div className="header-actions"><span>{workspaceItems.length} {isAudioWorkspace ? "recordings" : "exercises"}</span>{isAudioWorkspace && <button className="primary" onClick={beginNewAudio}>+ New audio</button>}<button className="quiet" onClick={() => load().catch(() => undefined)}>Refresh</button><button className="quiet" onClick={signOut}>Lock</button></div>
    </header>

    <div className="workspace">
      <aside>
        <input className="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={isAudioWorkspace ? "Search audio…" : "Search exercises…"} />
        <div className="exercise-list">{filtered.map((item) => <button key={item.id} className={`exercise-item ${selectedId === item.id ? "active" : ""}`} onClick={() => select(item)}><span className={`status-dot ${item.status}`} /><span><strong>{item.title}</strong><small>{item.category}</small></span></button>)}</div>
      </aside>

      <main className="editor">
        {draft ? <>
          <div className="editor-heading"><div><p className="eyebrow">{isAudioWorkspace ? "Audio recording" : "Somatic exercise"}</p><h2>{draft.title}</h2><code>{draft.id}</code></div><button className="primary save" disabled={busy || !draft.title.trim()} onClick={save}>{busy ? "Saving…" : isAudioWorkspace ? "Save audio" : "Save exercise"}</button></div>
          {message && <div className={message.includes("successfully") ? "notice success" : "notice error"}>{message}</div>}

          {isAudioWorkspace && <section className="panel image-panel">
            <div className="image-preview">{imageFile ? <img src={URL.createObjectURL(imageFile)} /> : draft.imageUrl ? <img src={draft.imageUrl} /> : <span>No image yet</span>}</div>
            <div><h3>Cover artwork</h3><p className="muted">Square WebP, PNG, or JPEG works best.</p><label className="file-button">Choose image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>{imageFile && <small>{imageFile.name}</small>}</div>
          </section>}

          {isAudioWorkspace ? <section className="panel image-panel audio-upload-panel">
            <div className="video-preview">{audioFile ? <audio src={URL.createObjectURL(audioFile)} controls /> : audio ? <audio src={audio.audioUrl} controls /> : <span>No audio uploaded</span>}</div>
            <div><h3>Audio file</h3><p className="muted">MP3 or M4A is recommended for iOS and Android. Maximum size: 250 MB.</p><div className="media-actions"><label className="file-button">Choose audio<input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm,audio/aac,audio/ogg,.mp3,.m4a,.aac,.wav,.webm,.ogg" onChange={(event) => setAudioFile(event.target.files?.[0] || null)} /></label>{audio && <button className="danger" type="button" disabled={busy} onClick={removeAudio}>Delete audio</button>}</div>{audioFile && <small>{audioFile.name}</small>}{audio && !audioFile && <small>Uploaded and ready to stream</small>}</div>
          </section> : <section className="panel image-panel">
            <div className="video-preview">{videoFile ? <video src={URL.createObjectURL(videoFile)} controls /> : video ? <video src={video.videoUrl} controls /> : <span>No video uploaded</span>}</div>
            <div><h3>Demonstration video</h3>{draft.guidanceType !== "video" ? <p className="muted">This exercise uses a {draft.guidanceType} guide and does not require a video.</p> : draft.exerciseId ? <><p className="muted">Upload MP4, MOV, or WebM. A new upload replaces the previous video.</p><div className="media-actions"><label className="file-button">Choose video<input type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} /></label>{video && <button className="danger" type="button" disabled={busy} onClick={removeVideo}>Delete video</button>}</div>{videoFile && <small>{videoFile.name}</small>}</> : <p className="muted">Set a linked practice ID and save first.</p>}</div>
          </section>}

          {isAudioWorkspace ? <section className="panel form-grid">
            <label className="wide">Recording title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>Collection<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Publishing status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Exercise["status"] })}><option value="published">Published in app</option><option value="draft">Draft — admin only</option><option value="archived">Archived</option></select></label>
            <label>Duration (seconds)<input type="number" min="1" value={draft.durationSeconds ?? ""} onChange={(event) => setDraft({ ...draft, durationSeconds: event.target.value ? Number(event.target.value) : null })} placeholder="300" /></label>
            <label>Display order<input type="number" min="0" value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) })} /></label>
            <label className="wide">Description<textarea rows={4} value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="What will the listener experience?" /></label>
            <label className="wide">Search and recommendation tags<input value={draft.recommendationTags.join(", ")} onChange={(event) => setDraft({ ...draft, recommendationTags: splitList(event.target.value) })} placeholder="sleep, calm, grounding" /></label>
            <label>Energy effect<select value={draft.activationLevel} onChange={(event) => setDraft({ ...draft, activationLevel: event.target.value as Exercise["activationLevel"] })}><option value="down_regulating">Calming</option><option value="neutral">Neutral</option><option value="up_regulating">Energising</option></select></label>
            <label>Linked audio ID<input value={draft.exerciseId || ""} disabled /></label>
            <label className="wide">Support goals<input value={draft.supportGoals.join(", ")} onChange={(event) => setDraft({ ...draft, supportGoals: splitList(event.target.value) })} placeholder="sleep, calm_down, feel_grounded" /></label>
            <label className="wide">Intended states<input value={draft.intendedStates.join(", ")} onChange={(event) => setDraft({ ...draft, intendedStates: splitList(event.target.value) })} placeholder="anxious, restless, overwhelmed" /></label>
          </section> : <section className="panel form-grid">
            <label className="wide">Exercise name<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
            <label>Category<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Guidance type<select value={draft.guidanceType} onChange={(event) => setDraft({ ...draft, guidanceType: event.target.value as Exercise["guidanceType"] })}>{exerciseGuidanceTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            <label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Exercise["status"] })}><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
            <label>Display order<input type="number" min="0" value={draft.displayOrder} onChange={(event) => setDraft({ ...draft, displayOrder: Number(event.target.value) })} /></label>
            <label>Source page<input type="number" min="1" value={draft.sourcePage} onChange={(event) => setDraft({ ...draft, sourcePage: Number(event.target.value) })} /></label>
            <label>Linked practice ID<input value={draft.exerciseId || ""} onChange={(event) => setDraft({ ...draft, exerciseId: event.target.value })} placeholder="Optional" /></label>
            <label className="wide">Description<textarea rows={4} value={draft.description || ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label className="wide">Recommendation tags<input value={draft.recommendationTags.join(", ")} onChange={(event) => setDraft({ ...draft, recommendationTags: splitList(event.target.value) })} /></label>
            <label>Duration (seconds)<input type="number" min="1" value={draft.durationSeconds ?? ""} onChange={(event) => setDraft({ ...draft, durationSeconds: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Activation<select value={draft.activationLevel} onChange={(event) => setDraft({ ...draft, activationLevel: event.target.value as Exercise["activationLevel"] })}><option value="down_regulating">Down regulating</option><option value="neutral">Neutral</option><option value="up_regulating">Up regulating</option></select></label>
            <label>Physical intensity<select value={draft.physicalIntensity} onChange={(event) => setDraft({ ...draft, physicalIntensity: event.target.value as Exercise["physicalIntensity"] })}><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>
            <label>Required position<select value={draft.positionRequired} onChange={(event) => setDraft({ ...draft, positionRequired: event.target.value as Exercise["positionRequired"] })}><option value="any">Any</option><option value="seated">Seated</option><option value="standing">Standing</option><option value="lying">Lying down</option></select></label>
            <label className="checkbox-row"><input type="checkbox" checked={draft.breathHoldRequired} onChange={(event) => setDraft({ ...draft, breathHoldRequired: event.target.checked })} />Requires breath holds</label>
            <label className="wide">Support goals<input value={draft.supportGoals.join(", ")} onChange={(event) => setDraft({ ...draft, supportGoals: splitList(event.target.value) })} /></label>
            <label className="wide">Intended states<input value={draft.intendedStates.join(", ")} onChange={(event) => setDraft({ ...draft, intendedStates: splitList(event.target.value) })} /></label>
            <label className="wide">Contraindication tags<input value={draft.contraindicationTags.join(", ")} onChange={(event) => setDraft({ ...draft, contraindicationTags: splitList(event.target.value) })} /></label>
            <label className="wide">Environment requirements<input value={draft.environmentRequirements.join(", ")} onChange={(event) => setDraft({ ...draft, environmentRequirements: splitList(event.target.value) })} /></label>
          </section>}
        </> : <div className="empty">{isAudioWorkspace ? "Create or select an audio recording." : "Select an exercise to begin."}</div>}
      </main>
    </div>
  </div>;
}
