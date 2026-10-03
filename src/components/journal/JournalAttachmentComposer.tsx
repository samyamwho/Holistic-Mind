import React, { useEffect, useRef, useState } from "react";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ImagePlus, Mic, X } from "lucide-react-native";
import type { DraftJournalAttachment } from "../../context/JournalContext";
import { MAX_JOURNAL_MEDIA_BYTES } from "../../services/journal/journalCrypto";
import { appSansFont as sansFont } from "../../theme/typography";

type Props = { attachments: DraftJournalAttachment[]; onChange: (items: DraftJournalAttachment[]) => void; disabled?: boolean };

export function JournalAttachmentComposer({ attachments, onChange, disabled }: Props) {
  const previousAttachments = useRef<DraftJournalAttachment[]>([]);
  const [recordOpen, setRecordOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recorder = useAudioRecorder(RecordingPresets.LOW_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    const currentIds = new Set(attachments.map((item) => item.id));
    for (const item of previousAttachments.current) {
      if (!currentIds.has(item.id)) removeTemporaryCopy(item.uri);
    }
    previousAttachments.current = attachments;
  }, [attachments]);
  useEffect(() => () => {
    for (const item of previousAttachments.current) removeTemporaryCopy(item.uri);
  }, []);

  const choosePhoto = async () => {
    if (disabled || busy) return;
    setError(""); setBusy(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.55, allowsMultipleSelection: false });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      const contentType = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"].includes(contentType)) throw new Error("Choose a JPEG, PNG, HEIC, or WebP photo.");
      if ((new File(asset.uri).info().size ?? 0) > MAX_JOURNAL_MEDIA_BYTES) throw new Error("Choose a photo smaller than 4 MB.");
      onChange([...attachments.filter((item) => item.kind !== "image"), { id: Crypto.randomUUID(), kind: "image", contentType, uri: asset.uri }]);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not add this photo."); }
    finally { setBusy(false); }
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

  const stopRecording = async (keep: boolean) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      if (keep && recorder.uri) {
        const file = new File(recorder.uri);
        if ((file.info().size ?? 0) > MAX_JOURNAL_MEDIA_BYTES) {
          removeTemporaryCopy(recorder.uri);
          throw new Error("Voice notes must be smaller than 4 MB. Try a shorter recording.");
        }
        const contentType = file.extension === ".3gp" ? "audio/3gpp" : file.extension === ".webm" ? "audio/webm" : "audio/mp4";
        onChange([...attachments.filter((item) => item.kind !== "audio"), { id: Crypto.randomUUID(), kind: "audio", contentType, uri: recorder.uri }]);
      } else if (recorder.uri) removeTemporaryCopy(recorder.uri);
      setRecordOpen(false);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Could not add this recording."); }
    finally { setBusy(false); }
  };

  return <>
    {attachments.length ? <View style={styles.attachments}>
      {attachments.map((item) => <View key={item.id} style={styles.attachment}>
        {item.kind === "image" ? <Image source={{ uri: item.uri }} style={styles.thumbnail} /> : <View style={styles.audioIcon}><Mic color="#70454A" size={16} /></View>}
        <Text style={styles.attachmentText}>{item.kind === "image" ? "Photo" : "Voice note"}</Text>
        <Pressable accessibilityLabel={`Remove ${item.kind === "image" ? "photo" : "voice note"}`} accessibilityRole="button" disabled={disabled} hitSlop={8} onPress={() => onChange(attachments.filter((current) => current.id !== item.id))} style={styles.remove}><X color="#70454A" size={16} /></Pressable>
      </View>)}
    </View> : null}
    <View style={styles.toolbar}>
      <Text style={styles.toolbarLabel}>ADD TO ENTRY</Text>
      <View style={styles.actions}>
        <Pressable accessibilityLabel="Add photo to this entry" accessibilityRole="button" disabled={disabled || busy} onPress={() => void choosePhoto()} style={styles.iconButton}><ImagePlus color="#70454A" size={19} strokeWidth={1.9} /></Pressable>
        <Pressable accessibilityLabel="Add voice note to this entry" accessibilityRole="button" disabled={disabled || busy} onPress={() => { setError(""); setRecordOpen(true); }} style={styles.iconButton}><Mic color="#70454A" size={19} strokeWidth={1.9} /></Pressable>
      </View>
    </View>
    {error && !recordOpen ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Modal animationType="slide" onRequestClose={() => { if (recorderState.isRecording) void stopRecording(false); else setRecordOpen(false); }} transparent visible={recordOpen}>
      <View style={styles.backdrop}><View style={styles.sheet}>
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Voice note</Text><Pressable accessibilityLabel="Close recording" accessibilityRole="button" onPress={() => { if (recorderState.isRecording) void stopRecording(false); else setRecordOpen(false); }} style={styles.close}><X color="#5F3B2B" size={21} /></Pressable></View>
        <Text style={styles.description}>Add a private recording to this entry. Keep it under 4 MB.</Text>
        <Text style={styles.timer}>{Math.floor(recorderState.durationMillis / 1000)}s</Text>
        {recorderState.isRecording ? <View style={styles.recordActions}><Pressable accessibilityRole="button" disabled={busy} onPress={() => void stopRecording(false)} style={styles.secondary}><Text style={styles.secondaryText}>Discard</Text></Pressable><Pressable accessibilityRole="button" disabled={busy} onPress={() => void stopRecording(true)} style={styles.primary}><Text style={styles.primaryText}>Attach recording</Text></Pressable></View> : <Pressable accessibilityRole="button" disabled={busy} onPress={() => void startRecording()} style={styles.primary}><Text style={styles.primaryText}>Start recording</Text></Pressable>}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View></View>
    </Modal>
  </>;
}

function removeTemporaryCopy(uri: string) {
  // Image picker and recorder create cache copies. Never delete a library original.
  if (!uri.startsWith(Paths.cache.uri)) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Cache cleanup is best effort. */ }
}

const styles = StyleSheet.create({
  attachments: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 10 },
  attachment: { height: 43, flexDirection: "row", alignItems: "center", gap: 7, paddingRight: 7, borderRadius: 13, backgroundColor: "rgba(223,162,177,.22)" },
  thumbnail: { width: 43, height: 43, borderTopLeftRadius: 13, borderBottomLeftRadius: 13 },
  audioIcon: { width: 36, alignItems: "center" },
  attachmentText: { color: "#70454A", fontFamily: sansFont, fontSize: 12, fontWeight: "700" },
  remove: { width: 25, height: 29, alignItems: "center", justifyContent: "center" },
  toolbar: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "rgba(95,59,43,.13)" },
  toolbarLabel: { color: "rgba(95,59,43,.45)", fontFamily: sansFont, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 12, backgroundColor: "rgba(223,162,177,.22)" },
  error: { marginTop: 8, color: "#9A4F5D", fontFamily: sansFont, fontSize: 12 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(40,27,24,.34)" },
  sheet: { padding: 22, paddingBottom: 42, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#FFF8EE" },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: "#5F3B2B", fontFamily: sansFont, fontSize: 23, fontWeight: "700" },
  close: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "rgba(95,59,43,.08)" },
  description: { marginTop: 8, color: "rgba(95,59,43,.66)", fontFamily: sansFont, fontSize: 13, lineHeight: 19 },
  timer: { marginVertical: 18, color: "#70454A", fontFamily: sansFont, fontSize: 36, fontWeight: "700", textAlign: "center" },
  recordActions: { flexDirection: "row", gap: 10 },
  primary: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#70454A" },
  primaryText: { color: "#FFF8EE", fontFamily: sansFont, fontSize: 14, fontWeight: "700" },
  secondary: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 10, borderRadius: 16, backgroundColor: "rgba(95,59,43,.09)" },
  secondaryText: { color: "#70454A", fontFamily: sansFont, fontSize: 14, fontWeight: "700" },
});
