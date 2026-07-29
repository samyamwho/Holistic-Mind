import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Activity,
  Baby,
  Brain,
  ChevronRight,
  CircleEllipsis,
  Clock3,
  Flower2,
  Footprints,
  HeartPulse,
  Search,
  Sparkles,
  Wind,
  X,
} from "lucide-react-native";
import {
  ImageBackground,
  Image,
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
import {
  exerciseCatalog,
  exerciseCategories,
  type ExerciseCatalogItem,
  type ExerciseCategory,
} from "../../data/exerciseCatalog";
import { getExerciseCatalog, type BackendExerciseCatalogItem } from "../../services/exercises/exerciseCatalogApi";

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
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ExerciseCategory>("All");
  const [catalog, setCatalog] = useState<Array<ExerciseCatalogItem & { imageUrl?: string | null }>>(exerciseCatalog);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    const interval = setInterval(() => refreshCatalog(), 15_000);
    return () => clearInterval(interval);
  }, [refreshCatalog]));

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalog.filter((exercise) => {
      const matchesCategory =
        selectedCategory === "All" || exercise.category === selectedCategory;
      const matchesQuery =
        !normalizedQuery ||
        exercise.title.toLowerCase().includes(normalizedQuery) ||
        exercise.category.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [catalog, query, selectedCategory]);

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

  const openExercise = (exercise: ExerciseCatalogItem) => {
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
                <Text style={styles.emptyTitle}>No exercises found</Text>
                <Text style={styles.emptyText}>Try another name or category.</Text>
              </View>
            }
            ListHeaderComponent={
              <View style={styles.header}>
                <View style={styles.titleRow}>
                  <View>
                    <Text style={styles.kicker}>Practice library</Text>
                    <Text style={styles.title}>Explore</Text>
                  </View>
                  <Text style={styles.count}>{filteredExercises.length} exercises</Text>
                </View>

                <View style={styles.searchField}>
                  <Search color="rgba(95,59,43,0.5)" size={20} strokeWidth={2} />
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setQuery}
                    placeholder="Search exercises"
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

                <ScrollView
                  contentContainerStyle={styles.filterContent}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filters}
                >
                  {exerciseCategories.map((category) => {
                    const isSelected = selectedCategory === category;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        key={category}
                        onPress={() => setSelectedCategory(category)}
                        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[styles.filterText, isSelected && styles.filterTextSelected]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            }
            renderItem={({ item }) => {
              const colors = categoryColors[item.category];
              const isAvailable = Boolean(item.exerciseId);

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
                    ) : (
                      <CategoryIcon category={item.category} color={colors.foreground} />
                    )}
                  </View>

                  <View style={styles.exerciseCopy}>
                    <Text numberOfLines={2} style={styles.exerciseTitle}>
                      {item.title}
                    </Text>
                    <Text numberOfLines={1} style={styles.exerciseMeta}>
                      {guidanceLabels[item.guidanceType]} · p. {item.sourcePage}
                    </Text>
                  </View>

                  {isAvailable ? (
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
  searchField: {
    minHeight: 48,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    backgroundColor: "rgba(255,255,255,0.52)",
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
  filters: {
    marginHorizontal: -22,
    marginTop: 13,
  },
  filterContent: {
    gap: 8,
    paddingHorizontal: 22,
    paddingBottom: 5,
  },
  filterChip: {
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 15,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(95,59,43,0.09)",
    backgroundColor: "rgba(255,255,255,0.44)",
  },
  filterChipSelected: {
    borderColor: "#673F3F",
    backgroundColor: "#673F3F",
  },
  filterText: {
    color: "rgba(95,59,43,0.7)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextSelected: {
    color: "#FFF8EE",
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
});
