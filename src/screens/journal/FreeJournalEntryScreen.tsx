import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ArrowLeft, Check, Feather } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { createJournalEntry } from "../../services/wellness/wellnessApi";
import { appSansFont as sansFont, screenLayout } from "../../theme/typography";

export default function FreeJournalEntryScreen({ navigation }: { navigation: any }) {
  const { runAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const bodyRef = useRef<TextInput>(null);
  const allowLeave = useRef(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const hasDraft = Boolean(title.trim() || body.trim());
  const canSave = Boolean(body.trim()) && !saving;

  useEffect(() => navigation.addListener("beforeRemove", (event: any) => {
    if (allowLeave.current || !hasDraft) return;
    event.preventDefault();
    Alert.alert(
      "Discard this entry?",
      "Your words have not been saved yet.",
      [
        { text: "Keep writing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            allowLeave.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ],
    );
  }), [hasDraft, navigation]);

  const save = async () => {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    setError("");
    try {
      await runAuthenticated((token) => createJournalEntry(token, {
        pack: "Free writing",
        prompt: title.trim() || "Untitled reflection",
        text,
      }));
      allowLeave.current = true;
      navigation.goBack();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "This entry could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return <View style={styles.root}>
    <StatusBar style="dark" />
    <ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
      <SafeAreaView edges={["bottom"]} style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
          <View style={[styles.header, { minHeight: insets.top + 64, paddingTop: insets.top }]}> 
            <Pressable accessibilityLabel="Close journal entry" accessibilityRole="button" hitSlop={8} onPress={navigation.goBack} style={styles.headerButton}>
              <ArrowLeft color="#5F3B2B" size={23} strokeWidth={2} />
            </Pressable>
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerKicker}>Private space</Text>
              <Text style={styles.headerTitle}>New entry</Text>
            </View>
            <Pressable accessibilityLabel="Save journal entry" accessibilityRole="button" accessibilityState={{ disabled: !canSave }} disabled={!canSave} onPress={() => void save()} style={[styles.doneButton, !canSave && styles.doneButtonDisabled]}>
              <Check color="#FFF8EE" size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <View style={styles.editor}>
            <View style={styles.dateRow}>
              <View style={styles.featherIcon}><Feather color="#8B5863" size={17} strokeWidth={1.8} /></View>
              <Text style={styles.dateText}>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Text>
            </View>
            <TextInput
              autoFocus
              blurOnSubmit={false}
              maxLength={160}
              onChangeText={setTitle}
              onSubmitEditing={() => bodyRef.current?.focus()}
              placeholder="Title"
              placeholderTextColor="rgba(95,59,43,.34)"
              returnKeyType="next"
              style={styles.titleInput}
              value={title}
            />
            <View style={styles.divider} />
            <TextInput
              maxLength={20000}
              multiline
              onChangeText={setBody}
              placeholder="Write whatever is here right now…"
              placeholderTextColor="rgba(95,59,43,.34)"
              ref={bodyRef}
              scrollEnabled
              style={styles.bodyInput}
              textAlignVertical="top"
              value={body}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{saving ? "Saving privately…" : `${body.length.toLocaleString()} characters`}</Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : <Text style={styles.privateText}>Only you can see this entry</Text>}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6E3C5" },
  background: { flex: 1 },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, borderWidth: 1, borderColor: "rgba(95,59,43,.11)", backgroundColor: "rgba(255,251,244,.52)" },
  headerTitleWrap: { flex: 1, alignItems: "center" },
  headerKicker: { color: "#9A5B6A", fontFamily: sansFont, fontSize: 8, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  headerTitle: { marginTop: 2, color: "#5F3B2B", fontFamily: sansFont, fontSize: 15, fontWeight: "700" },
  doneButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "#70454A", shadowColor: "#5F3B2B", shadowOpacity: .14, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  doneButtonDisabled: { opacity: .34 },
  editor: { flex: 1, marginHorizontal: screenLayout.horizontalPadding, marginTop: 14, paddingHorizontal: 20, paddingTop: 18, borderRadius: 25, borderWidth: 1, borderColor: "rgba(255,255,255,.68)", backgroundColor: "rgba(255,251,244,.62)" },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featherIcon: { width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: "rgba(223,162,177,.19)" },
  dateText: { color: "rgba(95,59,43,.50)", fontFamily: sansFont, fontSize: 10, fontWeight: "700" },
  titleInput: { minHeight: 68, paddingVertical: 12, color: "#5F3B2B", fontFamily: sansFont, fontSize: 28, lineHeight: 34, fontWeight: "700" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(95,59,43,.13)" },
  bodyInput: { flex: 1, minHeight: 250, paddingTop: 18, paddingBottom: 22, color: "#5F3B2B", fontFamily: sansFont, fontSize: 17, lineHeight: 27, fontWeight: "400" },
  footer: { minHeight: 54, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: screenLayout.horizontalPadding, paddingTop: 10, paddingBottom: 4 },
  footerText: { color: "rgba(95,59,43,.46)", fontFamily: sansFont, fontSize: 10, fontWeight: "700" },
  privateText: { color: "rgba(95,59,43,.46)", fontFamily: sansFont, fontSize: 10, fontWeight: "600" },
  error: { flex: 1, color: "#9A4F5D", fontFamily: sansFont, fontSize: 10, lineHeight: 14, fontWeight: "700", textAlign: "right" },
});
