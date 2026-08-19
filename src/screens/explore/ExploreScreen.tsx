import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Activity,
  Baby,
  Brain,
  Check,
  ChevronRight,
  CircleEllipsis,
  Clock3,
  Flower2,
  Footprints,
  HeartPulse,
  Headphones,
  Music2,
  Pause,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wind,
  X,
} from "lucide-react-native";
import {
  ImageBackground,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassContainer, GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  exerciseCatalog,
  exerciseCategories,
  type ExerciseCatalogItem,
  type ExerciseCategory,
} from "../../data/exerciseCatalog";
import { getExerciseCatalog, type BackendExerciseCatalogItem } from "../../services/exercises/exerciseCatalogApi";
import { useAudioPlayerController } from "../../context/AudioPlayerContext";

const categoryColors: Record<ExerciseCategory, { background: string; foreground: string }> = {
  "Nervous System Reset": { background: "rgba(223,162,177,0.28)", foreground: "#7A4652" },
  "Ancient Practices": { background: "rgba(111,127,98,0.18)", foreground: "#536148" },
  "Kundalini Yoga": { background: "rgba(246,227,197,0.68)", foreground: "#7A5A37" },
  Breathwork: { background: "rgba(189,214,214,0.38)", foreground: "#47676A" },
  "Hip & Pelvic": { background: "rgba(223,162,177,0.22)", foreground: "#754652" },
  "Spine & Core": { background: "rgba(167,181,145,0.24)", foreground: "#566347" },
  "Upper Body": { background: "rgba(238,197,151,0.28)", foreground: "#78583D" },
  "Sensory Regulation": { background: "rgba(194,178,211,0.3)", foreground: "#665477" },
  "Whole Body": { background: "rgba(177,204,188,0.3)", foreground: "#4F6759" },
  "For Children": { background: "rgba(244,192,174,0.3)", foreground: "#7D5144" },
  "Headache Relief": { background: "rgba(186,198,219,0.32)", foreground: "#4D5E78" },
};

const guidanceLabels: Record<ExerciseCatalogItem["guidanceType"], string> = {
  breathing: "Breathing guide",
  video: "Movement video",
  guided: "Guided practice",
  grounding: "Grounding practice",
  audio: "Audio guide",
};

function CategoryIcon({ category, color }: { category: ExerciseCategory; color: string }) {
  const commonProps = { color, size: 23, strokeWidth: 1.9 };

  switch (category) {
    case "Nervous System Reset":
      return <HeartPulse {...commonProps} />;
    case "Ancient Practices":
      return <Sparkles {...commonProps} />;
    case "Kundalini Yoga":
      return <Flower2 {...commonProps} />;
    case "Breathwork":
      return <Wind {...commonProps} />;
    case "Hip & Pelvic":
      return <Activity {...commonProps} />;
    case "Spine & Core":
      return <CircleEllipsis {...commonProps} />;
    case "Upper Body":
      return <Activity {...commonProps} />;
    case "Sensory Regulation":
      return <Brain {...commonProps} />;
    case "Whole Body":
      return <Footprints {...commonProps} />;
    case "For Children":
      return <Baby {...commonProps} />;
    case "Headache Relief":
      return <Brain {...commonProps} />;
  }
}

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const audioPlayer = useAudioPlayerController();
  const [library, setLibrary] = useState<"somatic" | "audio">("somatic");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ExerciseCategory>("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [catalog, setCatalog] = useState<Array<ExerciseCatalogItem & { imageUrl?: string | null; audioUrl?: string | null; audioDurationSeconds?: number | null }>>(exerciseCatalog);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const supportsLiquidGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const selectedLibraryColor = supportsLiquidGlass ? "#5F3B2B" : "#FFF8EE";

  const refreshCatalog = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    const controller = new AbortController();
    try {
      const items: BackendExerciseCatalogItem[] = await getExerciseCatalog(controller.signal);
      if (items.length > 0) setCatalog(items);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") console.warn("Using bundled exercise catalog fallback", error);
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    refreshCatalog();
    const interval = setInterval(() => refreshCatalog(), 3_000);
    return () => clearInterval(interval);
  }, [refreshCatalog]));

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalog.filter((exercise) => {
      const matchesLibrary = library === "audio" ? exercise.guidanceType === "audio" : exercise.guidanceType !== "audio";
      const matchesCategory =
        selectedCategory === "All" || exercise.category === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        exercise.title.toLowerCase().includes(normalizedQuery) ||
        exercise.category.toLowerCase().includes(normalizedQuery);

      return matchesLibrary && matchesCategory && matchesQuery;
    });
  }, [catalog, library, query, selectedCategory]);

  const sections = useMemo(
    () =>
      exerciseCategories
        .filter((category): category is ExerciseCategory => category !== "All")
        .map((category) => ({
          title: category,
          data: filteredExercises.filter((exercise) => exercise.category === category),
        }))
        .filter((section) => section.data.length > 0),
    [filteredExercises]
  );

  const openExercise = (exercise: ExerciseCatalogItem & { imageUrl?: string | null; audioUrl?: string | null; audioDurationSeconds?: number | null }) => {
    if (exercise.guidanceType === "audio") {
      if (!exercise.audioUrl) return;
      if (audioPlayer.track?.id !== exercise.id) {
        audioPlayer.playTrack({ id: exercise.id, title: exercise.title, category: exercise.category, audioUrl: exercise.audioUrl, imageUrl: exercise.imageUrl, durationSeconds: exercise.audioDurationSeconds }).catch((error) => console.warn("Unable to play audio", error));
      }
      navigation.navigate("AudioPlayer");
      return;
    }
    if (!exercise.exerciseId) {
      return;
    }

    navigation.navigate("Exercise", { exerciseId: exercise.exerciseId, catalogId: exercise.id });
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <SectionList
            contentContainerStyle={styles.content}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => refreshCatalog(true)} tintColor="#673F3F" />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Search color="rgba(95,59,43,0.42)" size={27} strokeWidth={1.8} />
                <Text style={styles.emptyTitle}>{library === "audio" ? "No audio found" : "No exercises found"}</Text>
                <Text style={styles.emptyText}>{library === "audio" ? "Upload and publish audio from the admin dashboard." : "Try another name or category."}</Text>
              </View>
            }
            ListHeaderComponent={
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View>
                    <Text style={styles.kicker}>Wellness library</Text>
                    <Text style={styles.title}>Explore</Text>
                  </View>
                  <Text style={styles.count}>{filteredExercises.length} {library === "audio" ? "recordings" : "exercises"}</Text>
                </View>

                <GlassContainer spacing={8} style={[styles.libraryTabs, supportsLiquidGlass && styles.libraryTabsLiquid]}>
                  <Pressable onPress={() => { setLibrary("somatic"); setSelectedCategory("All"); }} style={[styles.libraryTab, library === "somatic" && !supportsLiquidGlass && styles.libraryTabSelected]}>
                    {supportsLiquidGlass ? <GlassView glassEffectStyle={library === "somatic" ? "regular" : "clear"} isInteractive style={styles.libraryTabSurface} tintColor={library === "somatic" ? "#EABFC2" : undefined}>
                      <Activity color={library === "somatic" ? selectedLibraryColor : "#673F3F"} size={18} />
                      <Text style={styles.libraryTabText}>Somatic exercises</Text>
                    </GlassView> : <View style={styles.libraryTabSurface}>
                      <Activity color={library === "somatic" ? selectedLibraryColor : "#673F3F"} size={18} />
                      <Text style={[styles.libraryTabText, library === "somatic" && styles.libraryTabTextSelected]}>Somatic exercises</Text>
                    </View>}
                  </Pressable>
                  <Pressable onPress={() => { setLibrary("audio"); setSelectedCategory("All"); refreshCatalog(); }} style={[styles.libraryTab, library === "audio" && !supportsLiquidGlass && styles.libraryTabSelected]}>
                    {supportsLiquidGlass ? <GlassView glassEffectStyle={library === "audio" ? "regular" : "clear"} isInteractive style={styles.libraryTabSurface} tintColor={library === "audio" ? "#EABFC2" : undefined}>
                      <Headphones color={library === "audio" ? selectedLibraryColor : "#673F3F"} size={18} />
                      <Text style={styles.libraryTabText}>Audio library</Text>
                    </GlassView> : <View style={styles.libraryTabSurface}>
                      <Headphones color={library === "audio" ? selectedLibraryColor : "#673F3F"} size={18} />
                      <Text style={[styles.libraryTabText, library === "audio" && styles.libraryTabTextSelected]}>Audio library</Text>
                    </View>}
                  </Pressable>
                </GlassContainer>

                <View style={styles.searchField}>
                  <Search color="rgba(95,59,43,0.5)" size={20} strokeWidth={2} />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setQuery}
                    placeholder={library === "audio" ? "Search audio" : "Search exercises"}
                    placeholderTextColor="rgba(95,59,43,0.4)"
                    returnKeyType="search"
                    style={styles.searchInput}
                    value={query}
                  />
                  {query ? (
                    <Pressable
                      accessibilityLabel="Clear search"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => setQuery("")}
                      style={styles.clearButton}
                    >
                      <X color="rgba(95,59,43,0.62)" size={17} strokeWidth={2.2} />
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.filterBar}>
                  <View style={styles.filterCopy}>
                    <Text style={styles.filterLabel}>Showing</Text>
                    <Text numberOfLines={1} style={styles.filterValue}>{selectedCategory === "All" ? "All categories" : selectedCategory}</Text>
                  </View>
                  <Pressable accessibilityLabel="Filter by category" accessibilityRole="button" onPress={() => setFilterOpen(true)} style={[styles.filterButton, selectedCategory !== "All" && styles.filterButtonActive]}>
                    <SlidersHorizontal color={selectedCategory === "All" ? "#673F3F" : "#FFF8EE"} size={20} strokeWidth={2} />
                  </Pressable>
                </View>
              </View>
            }
            renderItem={({ item }) => {
              const colors = categoryColors[item.category] ?? { background: "rgba(223,162,177,.24)", foreground: "#673F3F" };
              const isAudio = item.guidanceType === "audio";
              const isAvailable = isAudio ? Boolean(item.audioUrl) : Boolean(item.exerciseId);
              const isCurrentAudio = isAudio && audioPlayer.track?.id === item.id;

              return (
                <Pressable
                  accessibilityLabel={item.title}
                  accessibilityRole={isAvailable ? "button" : undefined}
                  accessibilityState={{ disabled: !isAvailable }}
                  disabled={!isAvailable}
                  onPress={() => openExercise(item)}
                  style={styles.exerciseRow}
                >
                  <View style={[styles.exerciseIcon, { backgroundColor: colors.background }]}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.exerciseImage} />
                    ) : isAudio ? (
                      <Music2 color={colors.foreground} size={23} />
                    ) : (
                      <CategoryIcon category={item.category} color={colors.foreground} />
                    )}
                  </View>

                  <View style={styles.exerciseCopy}>
                    <Text numberOfLines={2} style={styles.exerciseTitle}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.exerciseMeta}>
                      {isAudio ? `${item.audioDurationSeconds ? `${Math.max(1, Math.round(item.audioDurationSeconds / 60))} min` : "Audio practice"} · Holistic Mind` : `${guidanceLabels[item.guidanceType]} · p. ${item.sourcePage}`}
                    </Text>
                  </View>

                  {isAvailable ? isAudio ? (
                    <View style={[styles.audioPlayIcon, isCurrentAudio && styles.audioPlayIconActive]}>{isCurrentAudio && audioPlayer.playing ? <Pause color={isCurrentAudio ? "#FFF8EE" : "#673F3F"} fill={isCurrentAudio ? "#FFF8EE" : "#673F3F"} size={15} /> : <Play color={isCurrentAudio ? "#FFF8EE" : "#673F3F"} fill={isCurrentAudio ? "#FFF8EE" : "#673F3F"} size={15} />}</View>
                  ) : (
                    <ChevronRight color="rgba(95,59,43,0.44)" size={21} strokeWidth={2} />
                  ) : (
                    <View style={styles.soonBadge}>
                      <Clock3 color="rgba(95,59,43,0.46)" size={13} strokeWidth={2} />
                      <Text style={styles.soonText}>Soon</Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length}</Text>
              </View>
            )}
            sections={sections}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        </SafeAreaView>
      </ImageBackground>
      <Modal animationType="fade" onRequestClose={() => setFilterOpen(false)} transparent visible={filterOpen}>
        <Pressable onPress={() => setFilterOpen(false)} style={styles.filterBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <View>
                <Text style={styles.filterSheetKicker}>Filter library</Text>
                <Text style={styles.filterSheetTitle}>Choose a category</Text>
              </View>
              <Pressable accessibilityLabel="Close filters" hitSlop={8} onPress={() => setFilterOpen(false)} style={styles.filterCloseButton}>
                <X color="#673F3F" size={20} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.filterOptions} showsVerticalScrollIndicator={false}>
              {exerciseCategories.map((category) => {
                const isSelected = selectedCategory === category;
                return <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={category}
                  onPress={() => { setSelectedCategory(category); setFilterOpen(false); }}
                  style={[styles.filterOption, isSelected && styles.filterOptionSelected]}
                >
                  <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>{category === "All" ? "All categories" : category}</Text>
                  {isSelected ? <Check color="#FFF8EE" size={18} strokeWidth={2.4} /> : null}
                </Pressable>;
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const sansFont = Platform.select({
  ios: "Helvetica Neue",
  android: "sans-serif",
  web: "Helvetica Neue, Helvetica, Arial, sans-serif",
  default: "sans-serif",
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7E9D4",
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingBottom: 128,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  kicker: {
    color: "rgba(95,59,43,0.58)",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
  },
  count: {
    paddingBottom: 5,
    color: "rgba(95,59,43,0.58)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "600",
  },
  libraryTabs: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    padding: 4,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,.46)",
  },
  libraryTabsLiquid: {
    padding: 0,
    backgroundColor: "transparent",
  },
  libraryTab: {
    minHeight: 46,
    flex: 1,
    borderRadius: 18,
  },
  libraryTabSurface: {
    width: "100%",
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: 18,
  },
  libraryTabSelected: {
    backgroundColor: "#673F3F",
  },
  libraryTabText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  libraryTabTextSelected: {
    color: "#FFF8EE",
  },
  searchField: {
    minHeight: 48,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    backgroundColor: "rgba(255,255,255,0.42)",
    shadowColor: "#5F3B2B",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 12,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "500",
  },
  clearButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: {
    minHeight: 54,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  filterCopy: {
    minWidth: 0,
    flex: 1,
  },
  filterLabel: {
    color: "rgba(95,59,43,.46)",
    fontFamily: sansFont,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: .8,
    textTransform: "uppercase",
  },
  filterValue: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: "700",
  },
  filterButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(95,59,43,.1)",
    backgroundColor: "rgba(255,255,255,.55)",
  },
  filterButtonActive: {
    borderColor: "#673F3F",
    backgroundColor: "#673F3F",
  },
  sectionHeader: {
    minHeight: 46,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
  },
  sectionTitle: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "700",
  },
  sectionCount: {
    color: "rgba(95,59,43,0.46)",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "700",
  },
  exerciseRow: {
    minHeight: 74,
    marginHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(95,59,43,0.12)",
  },
  exerciseIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseCopy: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 12,
  },
  exerciseTitle: {
    color: "#3F302A",
    fontFamily: sansFont,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  exerciseMeta: {
    marginTop: 3,
    color: "rgba(95,59,43,0.52)",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "500",
  },
  soonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  soonText: {
    color: "rgba(95,59,43,0.48)",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "700",
  },
  audioPlayIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(103,63,63,.10)",
  },
  audioPlayIconActive: {
    backgroundColor: "#673F3F",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 30,
    paddingTop: 78,
  },
  emptyTitle: {
    marginTop: 13,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    marginTop: 5,
    color: "rgba(95,59,43,0.56)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "500",
  },
  filterBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    backgroundColor: "rgba(39,25,21,.28)",
  },
  filterSheet: {
    maxHeight: "72%",
    overflow: "hidden",
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.82)",
    backgroundColor: "#FFF9F0",
    shadowColor: "#2F211C",
    shadowOpacity: .22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
  },
  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 14,
  },
  filterSheetKicker: {
    color: "rgba(95,59,43,.5)",
    fontFamily: sansFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterSheetTitle: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 20,
    fontWeight: "700",
  },
  filterCloseButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(103,63,63,.08)",
  },
  filterOptions: {
    gap: 7,
    paddingBottom: 16,
  },
  filterOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderRadius: 15,
    backgroundColor: "rgba(103,63,63,.055)",
  },
  filterOptionSelected: {
    backgroundColor: "#673F3F",
  },
  filterOptionText: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: "600",
  },
  filterOptionTextSelected: {
    color: "#FFF8EE",
  },
});
