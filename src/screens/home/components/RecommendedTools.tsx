import React, { useEffect, useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Check, SlidersHorizontal, X } from "lucide-react-native";
import type { Exercise, ExerciseSection } from "../../../types/wellness";
import { appSansFont as sansFont, typeScale } from "../../../theme/typography";

type RecommendedToolsProps = {
  title: string;
  tools: Exercise[];
  onSelectTool: (exerciseId: string) => void;
};

export default function RecommendedTools({ title, tools, onSelectTool }: RecommendedToolsProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<ExerciseSection | "All">("All");
  const sections = useMemo(
    () => Array.from(new Set(tools.map((tool) => tool.section))),
    [tools]
  );
  const visibleTools = selectedSection === "All"
    ? tools
    : tools.filter((tool) => tool.section === selectedSection);

  useEffect(() => {
    if (selectedSection !== "All" && !sections.includes(selectedSection)) {
      setSelectedSection("All");
    }
  }, [sections, selectedSection]);

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable
          accessibilityLabel={`Filter recommended exercises${selectedSection === "All" ? "" : `. Current filter: ${selectedSection}`}`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setFilterOpen(true)}
          style={[styles.filterTrigger, selectedSection !== "All" && styles.filterTriggerActive]}
        >
          <SlidersHorizontal color={selectedSection === "All" ? "#5F3B2B" : "#FFF8EE"} size={20} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={styles.exerciseGrid}>
        {visibleTools.map((exercise) => (
          <Pressable
            accessibilityHint="Opens the guided exercise"
            accessibilityLabel={exercise.title}
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => onSelectTool(exercise.id)}
            style={[styles.exerciseCard, { backgroundColor: exercise.color }]}
          >
            <View style={styles.exerciseImageFrame}>
              <Image
                accessibilityIgnoresInvertColors
                source={exercise.image}
                resizeMode="cover"
                style={styles.exerciseImage}
              />
            </View>
            <View style={styles.exerciseCopy}>
              <Text numberOfLines={1} style={styles.exerciseCategory}>
                {exercise.section} · {exercise.duration}
              </Text>
              <Text numberOfLines={2} style={styles.exerciseTitle}>{exercise.title}</Text>
              <Text numberOfLines={2} style={styles.exerciseWhy}>{exercise.why}</Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
        transparent
        visible={filterOpen}
      >
        <Pressable onPress={() => setFilterOpen(false)} style={styles.modalBackdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.filterSheet}>
            <View style={styles.filterSheetHeader}>
              <View style={styles.filterSheetCopy}>
                <Text style={styles.filterKicker}>Recommendations</Text>
                <Text style={styles.filterTitle}>Filter your tools</Text>
                <Text style={styles.filterSubtitle}>Choose the kind of support you want to see right now.</Text>
              </View>
              <Pressable
                accessibilityLabel="Close exercise filters"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setFilterOpen(false)}
                style={styles.closeButton}
              >
                <X color="#673F3F" size={19} />
              </Pressable>
            </View>

            <View style={styles.filterOptions}>
              {(["All", ...sections] as const).map((section) => {
                const selected = selectedSection === section;
                const count = section === "All"
                  ? tools.length
                  : tools.filter((tool) => tool.section === section).length;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={section}
                    onPress={() => {
                      setSelectedSection(section);
                      setFilterOpen(false);
                    }}
                    style={[styles.filterOption, selected && styles.filterOptionSelected]}
                  >
                    <View>
                      <Text style={[styles.filterOptionLabel, selected && styles.filterOptionLabelSelected]}>
                        {section === "All" ? "All recommendations" : section}
                      </Text>
                      <Text style={[styles.filterOptionCount, selected && styles.filterOptionCountSelected]}>
                        {count} {count === 1 ? "tool" : "tools"}
                      </Text>
                    </View>
                    {selected ? <Check color="#FFF8EE" size={18} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 18,
  },
  sectionTitle: {
    flex: 1,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.sectionTitle,
    lineHeight: typeScale.sectionTitleLine,
    fontWeight: "700",
  },
  filterTrigger: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.66)",
    backgroundColor: "rgba(255, 255, 255, 0.42)",
  },
  filterTriggerActive: {
    borderColor: "#704445",
    backgroundColor: "#704445",
  },
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  exerciseCard: {
    width: "48.2%",
    height: 244,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",
  },
  exerciseImageFrame: {
    width: 94,
    height: 94,
    alignSelf: "center",
    marginTop: 13,
    overflow: "hidden",
    borderRadius: 47,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.50)",
    backgroundColor: "rgba(95, 59, 43, 0.08)",
  },
  exerciseImage: {
    position: "absolute",
    top: -16,
    left: -18,
    width: 130,
    height: 130,
  },
  exerciseCopy: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  exerciseCategory: {
    color: "rgba(95, 59, 43, 0.66)",
    fontFamily: sansFont,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    letterSpacing: 0.25,
    textTransform: "uppercase",
  },
  exerciseTitle: {
    marginTop: 4,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
  },
  exerciseWhy: {
    marginTop: 6,
    color: "rgba(95, 59, 43, 0.68)",
    fontFamily: sansFont,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
    backgroundColor: "rgba(50, 35, 29, 0.34)",
  },
  filterSheet: {
    borderRadius: 28,
    padding: 20,
    paddingBottom: 26,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
  },
  filterSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  filterSheetCopy: {
    flex: 1,
  },
  filterKicker: {
    color: "rgba(95, 59, 43, 0.52)",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  filterTitle: {
    marginTop: 5,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
  },
  filterSubtitle: {
    marginTop: 5,
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: sansFont,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(95, 59, 43, 0.07)",
  },
  filterOptions: {
    marginTop: 20,
    gap: 9,
  },
  filterOption: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.10)",
    backgroundColor: "rgba(246, 227, 197, 0.30)",
  },
  filterOptionSelected: {
    borderColor: "#704445",
    backgroundColor: "#704445",
  },
  filterOptionLabel: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: "700",
  },
  filterOptionLabelSelected: {
    color: "#FFF8EE",
  },
  filterOptionCount: {
    marginTop: 3,
    color: "rgba(95, 59, 43, 0.50)",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "600",
  },
  filterOptionCountSelected: {
    color: "rgba(255, 248, 238, 0.72)",
  },
});
