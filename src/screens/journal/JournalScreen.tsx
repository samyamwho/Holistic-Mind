import React, { useEffect, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BookOpenText, Check, Lock, PenLine } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { createJournalEntry, getJournalEntries } from "../../services/wellness/wellnessApi";

type PromptPack = {
  id: string;
  label: string;
  prompt: string;
  locked?: boolean;
};

type JournalEntry = {
  id: string;
  pack: string;
  prompt: string;
  text: string;
  createdAt: string;
};

const promptPacks: PromptPack[] = [
  {
    id: "daily",
    label: "Daily",
    prompt: "What is one feeling you can make a little more room for today?",
  },
  {
    id: "anxiety",
    label: "Anxiety",
    prompt: "What might this anxiety be trying to protect you from?",
  },
  {
    id: "self-compassion",
    label: "Self-Compassion",
    prompt: "How would you speak to a friend feeling exactly what you feel right now?",
  },
  {
    id: "inner-child",
    label: "Inner Child",
    prompt: "What did your younger self need to hear that no one said?",
    locked: true,
  },
  {
    id: "boundaries",
    label: "Boundaries",
    prompt: "Where might a gentle no create more space for you?",
    locked: true,
  },
];

function formatEntryTime(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function JournalScreen() {
  const { runAuthenticated } = useAuth();
  const [selectedPackId, setSelectedPackId] = useState(promptPacks[0].id);
  const [draft, setDraft] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    runAuthenticated(getJournalEntries)
      .then(setEntries)
      .catch((error) => console.warn("Unable to load journal entries", error));
  }, [runAuthenticated]);

  const selectedPack = useMemo(
    () => promptPacks.find((pack) => pack.id === selectedPackId) ?? promptPacks[0],
    [selectedPackId]
  );
  const canSave = draft.trim().length > 0;

  const saveEntry = async () => {
    const text = draft.trim();

    if (!text) {
      return;
    }

    try {
      const saved = await runAuthenticated((token) => createJournalEntry(token, {
        pack: selectedPack.label,
        prompt: selectedPack.prompt,
        text,
      }));
      setEntries((current) => [saved, ...current]);
      setDraft("");
    } catch (error) {
      console.warn("Unable to save journal entry", error);
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>Private Space</Text>
                <Text style={styles.title}>Journal</Text>
              </View>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={require("../../../assets/onboarding/summary-reflect.png")}
                style={styles.headerImage}
              />
            </View>

            <View style={styles.promptShell}>
              <LinearGradient
                colors={[
                  "rgba(255, 255, 255, 0.72)",
                  "rgba(255, 250, 243, 0.42)",
                  "rgba(255, 255, 255, 0.24)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.promptCard}
              >
                <View pointerEvents="none" style={styles.glassHighlight} />
                <View style={styles.promptHeader}>
                  <View style={styles.promptBadge}>
                    <BookOpenText color="#5F3B2B" size={16} strokeWidth={2.3} />
                    <Text style={styles.promptBadgeText}>{selectedPack.label}</Text>
                  </View>
                  <Text style={styles.savedCount}>{entries.length} saved</Text>
                </View>

                <Text style={styles.promptText}>{selectedPack.prompt}</Text>

                <View style={styles.writer}>
                  <TextInput
                    multiline
                    onChangeText={setDraft}
                    placeholder="Start writing..."
                    placeholderTextColor="rgba(95, 59, 43, 0.34)"
                    style={styles.textInput}
                    textAlignVertical="top"
                    value={draft}
                  />
                </View>

                <View style={styles.actionRow}>
                  <View style={styles.draftMeta}>
                    <PenLine color="rgba(95, 59, 43, 0.62)" size={16} strokeWidth={2.2} />
                    <Text style={styles.draftMetaText}>{draft.trim().length} chars</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSave }}
                    disabled={!canSave}
                    onPress={saveEntry}
                    style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                  >
                    <Check color="#F6E3C5" size={17} strokeWidth={2.8} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </Pressable>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>Prompt Packs</Text>
            <ScrollView
              contentContainerStyle={styles.packRow}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {promptPacks.map((pack) => {
                const isSelected = selectedPack.id === pack.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: pack.locked }}
                    disabled={pack.locked}
                    key={pack.id}
                    onPress={() => setSelectedPackId(pack.id)}
                    style={[
                      styles.packChip,
                      isSelected && styles.packChipSelected,
                      pack.locked && styles.packChipLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.packText,
                        isSelected && styles.packTextSelected,
                        pack.locked && styles.packTextLocked,
                      ]}
                    >
                      {pack.label}
                    </Text>
                    {pack.locked ? <Lock color="rgba(95, 59, 43, 0.44)" size={14} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.entriesHeader}>
              <Text style={styles.sectionTitle}>Recent Entries</Text>
              <Text style={styles.entriesMeta}>{entries.length}</Text>
            </View>

            {entries.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyText}>Your saved reflections will appear here.</Text>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {entries.slice(0, 3).map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryTopRow}>
                      <Text style={styles.entryPack}>{entry.pack}</Text>
                      <Text style={styles.entryDate}>{formatEntryTime(entry.createdAt)}</Text>
                    </View>
                    <Text numberOfLines={2} style={styles.entryText}>
                      {entry.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const sansFont = Platform.select({
  ios: "Helvetica",
  android: "sans-serif",
  web: "Helvetica, Arial, sans-serif",
  default: "sans-serif",
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6E3C5",
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 124,
  },
  header: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 8,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 44,
    lineHeight: 50,
    fontWeight: "600",
    letterSpacing: 0,
  },
  headerImage: {
    width: 112,
    height: 96,
    opacity: 0.92,
  },
  promptShell: {
    marginTop: 12,
    borderRadius: 34,
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.12,
    shadowRadius: 30,
    elevation: 7,
  },
  promptCard: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.68)",
    overflow: "hidden",
    padding: 22,
  },
  glassHighlight: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 126,
    borderTopLeftRadius: 33,
    borderTopRightRadius: 33,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promptBadge: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.54)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.64)",
    paddingHorizontal: 12,
  },
  promptBadgeText: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "800",
  },
  savedCount: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  promptText: {
    marginTop: 24,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "400",
  },
  writer: {
    minHeight: 184,
    marginTop: 22,
    borderRadius: 26,
    backgroundColor: "rgba(255, 255, 255, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.64)",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  textInput: {
    minHeight: 150,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "500",
    letterSpacing: 0,
  },
  actionRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  draftMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  draftMetaText: {
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  saveButton: {
    minWidth: 112,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 24,
    backgroundColor: "rgba(95, 59, 43, 0.9)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  saveButtonDisabled: {
    opacity: 0.42,
  },
  saveButtonText: {
    color: "#F6E3C5",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "800",
  },
  sectionTitle: {
    marginTop: 28,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
  },
  packRow: {
    gap: 10,
    paddingTop: 14,
    paddingRight: 24,
  },
  packChip: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",
    paddingHorizontal: 16,
  },
  packChipSelected: {
    backgroundColor: "rgba(95, 59, 43, 0.88)",
    borderColor: "rgba(255, 255, 255, 0.24)",
  },
  packChipLocked: {
    opacity: 0.66,
  },
  packText: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "400",
  },
  packTextSelected: {
    color: "#F6E3C5",
  },
  packTextLocked: {
    color: "rgba(95, 59, 43, 0.54)",
  },
  entriesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  entriesMeta: {
    marginTop: 28,
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyPanel: {
    marginTop: 14,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.54)",
    padding: 18,
  },
  emptyText: {
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  entriesList: {
    marginTop: 14,
    gap: 12,
  },
  entryCard: {
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",
    padding: 16,
  },
  entryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  entryPack: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "800",
  },
  entryDate: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  entryText: {
    color: "rgba(95, 59, 43, 0.76)",
    fontFamily: sansFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
});
