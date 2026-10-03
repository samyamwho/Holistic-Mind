import React, { useEffect, useState } from "react";
import * as Clipboard from "expo-clipboard";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useJournal } from "../../context/JournalContext";

export function JournalPrivacyPanel() {
  const journal = useJournal();
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => { setInput(""); setCopied(false); setCopyError(""); }, [journal.state]);
  useEffect(() => { setCopied(false); setCopyError(""); }, [journal.backupCode]);

  const button = (label: string, action: () => void, secondary = false, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: journal.busy || disabled }}
      disabled={journal.busy || disabled} onPress={action}
      style={[styles.button, secondary && styles.secondaryButton, (journal.busy || disabled) && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{journal.busy ? "Please wait…" : label}</Text>
    </Pressable>
  );

  const copyRecoveryKey = async () => {
    if (!journal.backupCode) return;
    setCopyError("");
    try {
      const saved = await Clipboard.setStringAsync(journal.backupCode);
      if (!saved) throw new Error("Clipboard access was denied. Select and copy the key manually.");
      setCopied(true);
    } catch (error) {
      setCopied(false);
      setCopyError(error instanceof Error ? error.message : "The key could not be copied. Select it manually.");
    }
  };

  const keyCard = () => <View style={styles.keyCard}>
    <Text style={styles.keyLabel}>YOUR RECOVERY KEY</Text>
    <Text selectable accessibilityLabel="Journal recovery key" style={styles.code}>{journal.backupCode}</Text>
    {button(copied ? "Copied to clipboard" : "Copy recovery key", () => void copyRecoveryKey(), true)}
    <Text style={styles.note}>Keep this key private. Anyone with it and access to your account could read your journal. Clear it from your clipboard after saving it somewhere safe.</Text>
    {copyError ? <Text accessibilityRole="alert" style={styles.error}>{copyError}</Text> : null}
  </View>;

  return <View style={styles.panel}>
    <View style={styles.heading}>
      <Text style={styles.kicker}>DEVICE-ONLY ENCRYPTION</Text>
      <Text style={styles.title}>{journal.state === "ready" ? "Your private journal" :
        journal.state === "recover" ? "Restore your journal" :
        journal.state === "setup" ? "Save your recovery key" : "Open your journal"}</Text>
    </View>

    {journal.state === "locked" && <>
      <Text style={styles.text}>Your journal is encrypted on this device before it is saved. Open it to read or write entries.</Text>
      {button("Open journal", () => void journal.unlock())}
    </>}

    {journal.state === "setup" && <>
      <Text style={styles.text}>Save this key in a password manager or another safe place. You will need it to read your entries on a new device. If you lose every device and this key, your entries cannot be recovered.</Text>
      {keyCard()}
      <Text style={styles.fieldLabel}>Confirm the last 8 characters of the key</Text>
      <TextInput accessibilityLabel="Last eight characters of recovery key" autoCapitalize="none"
        autoCorrect={false} autoComplete="off" maxLength={8} placeholder="Last 8 characters"
        placeholderTextColor="#9B8279" style={styles.input} value={input} onChangeText={setInput} />
      {button("I saved my key — enable encryption", () => void journal.create(input), false, input.trim().length !== 8)}
    </>}

    {journal.state === "recover" && <>
      <Text style={styles.text}>Enter the key you saved earlier. Your account password cannot decrypt your journal.</Text>
      <Text style={styles.fieldLabel}>Recovery key</Text>
      <TextInput accessibilityLabel="Journal recovery key" placeholder="HMJ1.…" placeholderTextColor="#9B8279"
        autoCapitalize="none" autoCorrect={false} autoComplete="off" secureTextEntry
        style={styles.input} value={input} onChangeText={setInput} />
      {button("Restore on this device", () => void journal.recover(input), false, !input.trim())}
    </>}

    {journal.state === "ready" && journal.legacyCount > 0 && <View style={styles.notice}>
      <Text style={styles.noticeTitle}>Older entries need encryption</Text>
      <Text style={styles.text}>{journal.legacyCount} older entries still have readable text on the server. Keep this screen open while they are encrypted. You can safely resume if interrupted.</Text>
      {button("Encrypt older entries", () => void journal.migrate())}
    </View>}

    {journal.state === "ready" && <>
      <Text style={styles.text}>Your device holds the key. Keep a separate recovery copy so you can restore entries later.</Text>
      {journal.backupCode ? <>{keyCard()}{button("Hide recovery key", journal.hideRecovery, true)}</> :
        button("Show recovery key", journal.showRecovery, true)}
      <Text style={styles.note}>Locking clears unsaved journal drafts.</Text>
      {button("Lock journal", journal.lock)}
    </>}

    {Platform.OS === "web" && <Text style={styles.note}>In this browser, the key is kept only for this unlocked session. Keep your recovery key available.</Text>}
    {journal.error ? <Text accessibilityRole="alert" style={styles.error}>{journal.error}</Text> : null}
  </View>;
}

export function JournalPrivacyGate({ children, onBack }: { children: React.ReactNode; onBack?: () => void }) {
  const journal = useJournal();
  if (journal.state === "ready" && journal.legacyCount === 0) return <>{children}</>;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
    {onBack && <Pressable accessibilityRole="button" onPress={onBack}><Text style={styles.back}>‹ Back</Text></Pressable>}
    <JournalPrivacyPanel />
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 24, paddingTop: 64, backgroundColor: "#F6E3C5", justifyContent: "center" },
  back: { color: "#673F3F", fontSize: 17, marginBottom: 12 },
  panel: { gap: 16, padding: 24, borderRadius: 24, backgroundColor: "#FFF8EE", width: "100%", maxWidth: 600, alignSelf: "center", borderWidth: 1, borderColor: "#E9D9C9" },
  heading: { gap: 8, marginBottom: 2 }, kicker: { color: "#8B5863", fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: "#5F3B2B", fontSize: 27, fontWeight: "700", lineHeight: 33 },
  text: { color: "#5F3B2B", fontSize: 15, lineHeight: 23 },
  fieldLabel: { color: "#5F3B2B", fontSize: 13, fontWeight: "700" },
  keyCard: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: "#F6E9D8", borderWidth: 1, borderColor: "#DEC4B5" },
  keyLabel: { color: "#8B5863", fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  code: { color: "#5F3B2B", fontSize: 14, lineHeight: 23, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  note: { color: "#795E55", fontSize: 12, lineHeight: 18 },
  notice: { gap: 12, padding: 16, borderRadius: 16, backgroundColor: "#F9EDDB" },
  noticeTitle: { color: "#5F3B2B", fontSize: 16, fontWeight: "700" },
  input: { borderWidth: 1, borderColor: "#B89A8D", borderRadius: 12, padding: 14, color: "#5F3B2B", backgroundColor: "#FFFCF7", fontSize: 16 },
  button: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: "#70454A", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFF8EE", fontWeight: "700", fontSize: 15, textAlign: "center" },
  secondaryButton: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#70454A" },
  secondaryButtonText: { color: "#70454A" }, disabled: { opacity: .5 },
  error: { color: "#9A3345", fontSize: 14, lineHeight: 21 },
});
