import React, { useCallback, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowRight, BookOpenText, Check, Lock, PenLine, Plus } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { createJournalEntry, getJournalEntries } from "../../services/wellness/wellnessApi";
import { appSansFont as sansFont, screenLayout, typeScale } from "../../theme/typography";

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
  const navigation = useNavigation<any>();
  const { runAuthenticated } = useAuth();
  const [selectedPackId, setSelectedPackId] = useState(promptPacks[0].id);
  const [draft, setDraft] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    runAuthenticated(getJournalEntries)
      .then((savedEntries) => {
        if (active) setEntries(savedEntries);
      })
      .catch((error) => console.warn("Unable to load journal entries", error));
    return () => { active = false; };
  }, [runAuthenticated]));

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
    <View collapsable={false} style={styles.root}>
      <ImageBackground
        {...({ collapsable: false } as any)}
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView collapsable={false} style={styles.safeArea} edges={["top", "bottom"]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.kicker}>Private Space</Text>
                <Text style={styles.title}>Journal</Text>
                <Text style={styles.headerHint}>Follow a prompt or simply write what is here.</Text>
              </View>
              <Pressable
                accessibilityLabel="Write a free journal entry"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.navigate("FreeJournalEntry")}
                style={({ pressed }) => [styles.newEntryButton, pressed && styles.newEntryButtonPressed]}
              >
                <View style={styles.newEntrySurface}>
                  <Plus color="#FFF8EE" size={24} strokeWidth={2.2} />
                </View>
              </Pressable>
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
                    <View style={styles.promptBadgeDot} />
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
              <Pressable
                accessibilityLabel="View all journal history"
                accessibilityRole="button"
                onPress={() => navigation.navigate("History")}
                style={styles.viewAllButton}
              >
                <Text style={styles.entriesMeta}>View all</Text>
                <ArrowRight color="rgba(95, 59, 43, 0.62)" size={15} strokeWidth={2.4} />
              </Pressable>
            </View>

            {entries.length === 0 ? (
              <View style={styles.emptyPanel}>
                <Text style={styles.emptyText}>Your saved reflections will appear here.</Text>
              </View>
            ) : (
              <View style={styles.entriesList}>
                {entries.slice(0, 3).map((entry) => (
                  <View key={entry.id} style={styles.entryCard}>
                    <View style={styles.entryIcon}>
                      <BookOpenText color="#7A4652" size={20} strokeWidth={1.9} />
                    </View>
                    <View style={styles.entryContent}>
                      <View style={styles.entryTopRow}>
                        <Text style={styles.entryPack}>{entry.pack}</Text>
                        <Text style={styles.entryDate}>{formatEntryTime(entry.createdAt)}</Text>
                      </View>
                      {entry.pack === "Free writing" ? (
                        <Text numberOfLines={1} style={styles.entryPrompt}>{entry.prompt}</Text>
                      ) : null}
                      <Text numberOfLines={2} style={styles.entryText}>
                        {entry.text}
                      </Text>
                    </View>
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
    paddingHorizontal: screenLayout.horizontalPadding,
    paddingTop: screenLayout.topPadding,
    paddingBottom: 124,
  },
  header: {
    minHeight: screenLayout.headerHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kicker: {
    color: "rgba(95,59,43,0.58)",
    fontFamily: sansFont,
    fontSize: typeScale.screenKicker,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.screenTitle,
    lineHeight: typeScale.screenTitleLine,
    fontWeight: "700",
  },
  headerHint: {
    maxWidth: 250,
    marginTop: 5,
    color: "rgba(95, 59, 43, 0.56)",
    fontFamily: sansFont,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  newEntryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  newEntrySurface: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: "#70454A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.34)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.14,
    shadowRadius: 15,
    elevation: 4,
  },
  newEntryButtonPressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
  promptShell: {
    marginTop: 14,
    borderRadius: 28,
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  promptCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.68)",
    overflow: "hidden",
    padding: 18,
  },
  glassHighlight: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 126,
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  promptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  promptBadge: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 16,
    backgroundColor: "rgba(223,162,177,0.26)",
    paddingHorizontal: 11,
  },
  promptBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#9A5B6A",
  },
  promptBadgeText: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  savedCount: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  promptText: {
    marginTop: 18,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.heroTitle,
    lineHeight: typeScale.heroTitleLine,
    fontWeight: "600",
  },
  writer: {
    minHeight: 134,
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.52)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.64)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textInput: {
    minHeight: 106,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.itemTitle,
    lineHeight: 22,
    fontWeight: "500",
    letterSpacing: 0,
  },
  actionRow: {
    marginTop: 14,
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
    fontSize: typeScale.meta,
    fontWeight: "700",
  },
  saveButton: {
    minWidth: 104,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 22,
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
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    marginTop: 24,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.itemTitle,
    lineHeight: typeScale.itemTitleLine,
    fontWeight: "700",
  },
  packRow: {
    gap: 8,
    paddingTop: 12,
    paddingRight: 24,
  },
  packChip: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",
    paddingHorizontal: 14,
  },
  packChipSelected: {
    backgroundColor: "rgba(223,162,177,0.46)",
    borderColor: "rgba(154,91,106,0.18)",
  },
  packChipLocked: {
    opacity: 0.66,
  },
  packText: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.control,
    fontWeight: "600",
  },
  packTextSelected: {
    color: "#673F3F",
  },
  packTextLocked: {
    color: "rgba(95, 59, 43, 0.54)",
  },
  entriesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewAllButton: {
    marginTop: 24,
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 10,
  },
  entriesMeta: {
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "700",
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
    marginTop: 10,
  },
  entryCard: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(95,59,43,0.12)",
    paddingVertical: 12,
  },
  entryIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(223,162,177,0.24)",
  },
  entryContent: {
    minWidth: 0,
    flex: 1,
  },
  entryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  entryPack: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  entryDate: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "600",
  },
  entryPrompt: {
    marginBottom: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  entryText: {
    color: "rgba(95, 59, 43, 0.76)",
    fontFamily: sansFont,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
});
