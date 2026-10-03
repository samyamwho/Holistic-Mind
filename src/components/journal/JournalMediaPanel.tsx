import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { createAudioPlayer, RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { ImagePlus, Mic, Pause, Play, Trash2, X } from "lucide-react-native";
import { useJournal } from "../../context/JournalContext";
import { MAX_JOURNAL_MEDIA_BYTES, type JournalMedia } from "../../services/journal/journalCrypto";
import { appSansFont as sansFont } from "../../theme/typography";

type Props = { menuOpen: boolean; onCloseMenu: () => void; onWrite: () => void; requestedMedia?: JournalMedia | null; onCloseViewer?: () => void; showLegacy?: boolean };

function mediaDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function JournalMediaPanel({ menuOpen, onCloseMenu, onWrite, requestedMedia, onCloseViewer, showLegacy = true }: Props) {
  const { getMedia, saveMedia, openMedia, deleteMedia } = useJournal();
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [mode, setMode] = useState<"menu" | "record">("menu");
  const [viewer, setViewer] = useState<JournalMedia | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const previewFile = useRef<File | null>(null);
  const previewPlayer = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const viewerGeneration = useRef(0);
  const photoRequested = useRef(false);
  const [playingPreview, setPlayingPreview] = useState(false);

  const refresh = useCallback(() => getMedia().then((items) => setMedia(items.filter((item) => !item.entryId))), [getMedia]);
  useFocusEffect(useCallback(() => {
    void refresh().catch(() => setError("Could not load journal attachments."));
  }, [refresh]));

  const clearPreview = useCallback(() => {
    previewPlayer.current?.pause();
    previewPlayer.current?.remove();
    previewPlayer.current = null;
    if (previewFile.current?.exists) previewFile.current.delete();
    previewFile.current = null;
    setPreviewUri(null);
    setPlayingPreview(false);
  }, []);
  useEffect(() => () => {
    viewerGeneration.current++;
    previewPlayer.current?.pause();
    previewPlayer.current?.remove();
    if (previewFile.current?.exists) previewFile.current.delete();
    if (recorder.isRecording) void recorder.stop();
  }, [recorder]);

  const closeViewer = () => { viewerGeneration.current++; clearPreview(); setViewer(null); setError(""); onCloseViewer?.(); };
  const closeMenu = () => { onCloseMenu(); setMode("menu"); setError(""); };

  const choosePhoto = async () => {
    setBusy(true); setError("");
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.55, allowsMultipleSelection: false });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const contentType = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"].includes(contentType)) {
        throw new Error("Choose a JPEG, PNG, HEIC, or WebP photo.");
      }
      const file = new File(asset.uri);
      if ((file.info().size ?? 0) > MAX_JOURNAL_MEDIA_BYTES) throw new Error("Choose a photo smaller than 4 MB.");
      try {
        const bytes = await file.bytes();
        try { await saveMedia("image", contentType, bytes); }
        finally { bytes.fill(0); }
      } finally { if (file.exists) file.delete(); }
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save this photo.");
    } finally { setBusy(false); }
  };

  const beginPhoto = () => {
    photoRequested.current = Platform.OS === "ios";
    closeMenu();
    if (Platform.OS !== "ios") setTimeout(() => void choosePhoto(), 350);
  };

  const startRecording = async () => {
    setError("");
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error("Allow microphone access to record a voice note.");
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not start recording."); }
  };

  const stopRecording = async (save: boolean) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (recorder.uri) {
        const file = new File(recorder.uri);
        try {
          if (save) {
            if ((file.info().size ?? 0) > MAX_JOURNAL_MEDIA_BYTES) throw new Error("Voice notes must be smaller than 4 MB. Try a shorter recording.");
            const contentType = file.extension === ".3gp" ? "audio/3gpp" : file.extension === ".webm" ? "audio/webm" : "audio/mp4";
            const bytes = await file.bytes();
            try { await saveMedia("audio", contentType, bytes); }
            finally { bytes.fill(0); }
            await refresh();
          }
        } finally { if (file.exists) file.delete(); }
      }
      closeMenu();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not save this recording."); }
    finally { setBusy(false); }
  };

  const openViewer = async (item: JournalMedia) => {
    const generation = ++viewerGeneration.current;
    clearPreview(); setViewer(item); setBusy(true); setError("");
    try {
      const opened = await openMedia(item.id);
      if (generation !== viewerGeneration.current) { opened.bytes.fill(0); return; }
      const extension = item.kind === "image"
        ? item.contentType === "image/png" ? ".png" : item.contentType === "image/webp" ? ".webp" : item.contentType.includes("heic") || item.contentType.includes("heif") ? ".heic" : ".jpg"
        : item.contentType === "audio/webm" ? ".webm" : item.contentType === "audio/3gpp" ? ".3gp" : ".m4a";
      const file = new File(Paths.cache, `journal-preview-${item.id}${extension}`);
      previewFile.current = file;
      try { file.write(opened.bytes); }
      finally { opened.bytes.fill(0); }
      setPreviewUri(file.uri);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not open this attachment."); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (requestedMedia) void openViewer(requestedMedia); }, [requestedMedia?.id]);

  const togglePlayback = () => {
    if (!previewUri) return;
    if (!previewPlayer.current) previewPlayer.current = createAudioPlayer({ uri: previewUri });
    if (playingPreview) previewPlayer.current.pause(); else previewPlayer.current.play();
    setPlayingPreview(!playingPreview);
  };

  const removeViewed = async () => {
    if (!viewer || busy) return;
    setBusy(true); setError("");
    try { await deleteMedia(viewer.id); closeViewer(); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not remove this attachment."); }
    finally { setBusy(false); }
  };
  const confirmRemove = () => Alert.alert("Delete this attachment?", "This photo or voice note cannot be recovered after deletion.", [
    { text: "Keep it", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: () => void removeViewed() },
  ]);

  return <>
    {showLegacy && media.length ? <View style={styles.section}>
      <Text style={styles.sectionTitle}>Photos & voice notes</Text>
      {media.map((item) => <Pressable accessibilityRole="button" key={item.id} onPress={() => void openViewer(item)} style={styles.mediaRow}>
        <View style={styles.mediaIcon}>{item.kind === "image" ? <ImagePlus color="#70454A" size={21} /> : <Mic color="#70454A" size={21} />}</View>
        <View style={styles.mediaCopy}><Text style={styles.mediaTitle}>{item.kind === "image" ? "Photo" : "Voice note"}</Text><Text style={styles.mediaDate}>{mediaDate(item.createdAt)}</Text></View>
        <Text style={styles.openLabel}>Open</Text>
      </Pressable>)}
    </View> : null}
    {error && !menuOpen && !viewer ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {busy && !menuOpen && !viewer ? <Text style={styles.status}>Saving privately…</Text> : null}

    <Modal animationType="slide" onDismiss={() => {
      if (photoRequested.current) { photoRequested.current = false; void choosePhoto(); }
    }} onRequestClose={viewer ? closeViewer : closeMenu} transparent visible={menuOpen || !!viewer}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{viewer ? viewer.kind === "image" ? "Private photo" : "Private voice note" : mode === "record" ? "Voice note" : "Add to journal"}</Text>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={() => { if (viewer) closeViewer(); else if (recorderState.isRecording) void stopRecording(false); else closeMenu(); }} style={styles.closeButton}><X color="#5F3B2B" size={21} /></Pressable>
          </View>
          {viewer ? <>
            {busy ? <Text style={styles.status}>Decrypting on this device…</Text> : null}
            {previewUri && viewer.kind === "image" ? <Image resizeMode="contain" source={{ uri: previewUri }} style={styles.previewImage} /> : null}
            {previewUri && viewer.kind === "audio" ? <Pressable accessibilityRole="button" onPress={togglePlayback} style={styles.option}><View style={styles.optionIcon}>{playingPreview ? <Pause color="#70454A" size={22} /> : <Play color="#70454A" size={22} />}</View><Text style={styles.optionText}>{playingPreview ? "Pause" : "Play voice note"}</Text></Pressable> : null}
            {!viewer.entryId ? <Pressable accessibilityRole="button" disabled={busy} onPress={confirmRemove} style={styles.deleteButton}><Trash2 color="#9A4F5D" size={18} /><Text style={styles.deleteText}>Delete attachment</Text></Pressable> : null}
          </> : mode === "record" ? <>
            <Text style={styles.description}>Only this device can decrypt your recording. Keep it under 4 MB.</Text>
            <Text style={styles.timer}>{Math.floor(recorderState.durationMillis / 1000)}s</Text>
            {recorderState.isRecording ? <View style={styles.recordActions}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void stopRecording(false)} style={styles.secondaryButton}><Text style={styles.secondaryText}>Discard</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void stopRecording(true)} style={styles.primaryButton}><Text style={styles.primaryText}>Stop & save</Text></Pressable>
            </View> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => void startRecording()} style={styles.primaryButton}><Text style={styles.primaryText}>Start recording</Text></Pressable>}
          </> : <>
            <Text style={styles.description}>Photos and voice notes are encrypted on your device before saving.</Text>
            <Pressable accessibilityRole="button" onPress={() => { closeMenu(); onWrite(); }} style={styles.option}><View style={styles.optionIcon}><Text style={styles.optionEmoji}>✎</Text></View><Text style={styles.optionText}>Write an entry</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={beginPhoto} style={styles.option}><View style={styles.optionIcon}><ImagePlus color="#70454A" size={22} /></View><Text style={styles.optionText}>Add a photo</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMode("record")} style={styles.option}><View style={styles.optionIcon}><Mic color="#70454A" size={22} /></View><Text style={styles.optionText}>Record a voice note</Text></Pressable>
          </>}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  section: { marginTop: 24, gap: 9 },
  sectionTitle: { marginBottom: 3, color: "#5F3B2B", fontFamily: sansFont, fontSize: 21, fontWeight: "700" },
  mediaRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12, borderRadius: 19, backgroundColor: "rgba(255,251,244,.78)" },
  mediaIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "rgba(223,162,177,.2)" },
  mediaCopy: { flex: 1 },
  mediaTitle: { color: "#5F3B2B", fontFamily: sansFont, fontSize: 14, fontWeight: "700" },
  mediaDate: { marginTop: 2, color: "rgba(95,59,43,.54)", fontFamily: sansFont, fontSize: 11 },
  openLabel: { color: "#8B5863", fontFamily: sansFont, fontSize: 12, fontWeight: "700" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(40,27,24,.34)" },
  sheet: { minHeight: 225, padding: 22, paddingBottom: 42, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#FFF8EE" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: "#5F3B2B", fontFamily: sansFont, fontSize: 23, fontWeight: "700" },
  closeButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "rgba(95,59,43,.08)" },
  description: { marginTop: 8, marginBottom: 14, color: "rgba(95,59,43,.66)", fontFamily: sansFont, fontSize: 13, lineHeight: 19 },
  option: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 9, paddingHorizontal: 12, borderRadius: 17, backgroundColor: "rgba(246,227,197,.45)" },
  optionIcon: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "rgba(223,162,177,.2)" },
  optionEmoji: { color: "#70454A", fontSize: 25 },
  optionText: { color: "#5F3B2B", fontFamily: sansFont, fontSize: 15, fontWeight: "700" },
  timer: { marginVertical: 18, color: "#70454A", fontFamily: sansFont, fontSize: 36, fontWeight: "700", textAlign: "center" },
  recordActions: { flexDirection: "row", gap: 10 },
  primaryButton: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 10, borderRadius: 16, backgroundColor: "#70454A" },
  primaryText: { color: "#FFF8EE", fontFamily: sansFont, fontSize: 14, fontWeight: "700" },
  secondaryButton: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 10, borderRadius: 16, backgroundColor: "rgba(95,59,43,.09)" },
  secondaryText: { color: "#70454A", fontFamily: sansFont, fontSize: 14, fontWeight: "700" },
  previewImage: { width: "100%", height: 320, marginTop: 16, borderRadius: 18 },
  deleteButton: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 14 },
  deleteText: { color: "#9A4F5D", fontFamily: sansFont, fontSize: 13, fontWeight: "700" },
  error: { marginTop: 10, color: "#9A4F5D", fontFamily: sansFont, fontSize: 12, lineHeight: 17 },
  status: { marginTop: 10, color: "#795E55", fontFamily: sansFont, fontSize: 12 },
});
