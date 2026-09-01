import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import type { Exercise } from "../../../types/wellness";
import { appSansFont as sansFont, typeScale } from "../../../theme/typography";

type RecommendedToolsProps = {
  title: string;
  tools: Exercise[];
  showImages?: boolean;
  onSelectTool: (exerciseId: string) => void;
};

export default function RecommendedTools({ title, tools, showImages = false, onSelectTool }: RecommendedToolsProps) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <SlidersHorizontal color="#5F3B2B" size={22} strokeWidth={2.2} />
      </View>

      <View style={styles.exerciseGrid}>
        {tools.map((exercise) => (
          <Pressable
            accessibilityHint="Opens the guided exercise"
            accessibilityLabel={exercise.title}
            accessibilityRole="button"
            key={exercise.id}
            onPress={() => onSelectTool(exercise.id)}
            style={[styles.exerciseCard, !showImages && styles.exerciseCardWithoutImage, { backgroundColor: exercise.color }]}
          >
            {showImages ? <View style={styles.exerciseImageFrame}>
              <Image
                accessibilityIgnoresInvertColors
                source={exercise.image}
                resizeMode="cover"
                style={styles.exerciseImage}
              />
            </View> : null}
            <View style={[styles.exerciseCopy, !showImages && styles.exerciseCopyWithoutImage]}>
              <Text numberOfLines={1} style={styles.exerciseCategory}>
                {exercise.section} · {exercise.duration}
              </Text>
              <Text numberOfLines={2} style={styles.exerciseTitle}>{exercise.title}</Text>
              <Text numberOfLines={3} style={styles.exerciseWhy}>{exercise.why}</Text>
            </View>
          </Pressable>
        ))}
      </View>
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
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  exerciseCard: {
    width: "47.8%",
    minHeight: 310,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",
  },
  exerciseCardWithoutImage: {
    minHeight: 168,
  },
  exerciseImageFrame: {
    width: "100%",
    aspectRatio: 1,
    overflow: "hidden",
    backgroundColor: "rgba(95, 59, 43, 0.08)",
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseCopy: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 15,
  },
  exerciseCopyWithoutImage: {
    paddingHorizontal: 15,
    paddingVertical: 17,
  },
  exerciseCategory: {
    color: "rgba(95, 59, 43, 0.66)",
    fontFamily: sansFont,
    fontSize: typeScale.meta,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  exerciseTitle: {
    marginTop: 4,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.itemTitle,
    lineHeight: typeScale.itemTitleLine,
    fontWeight: "800",
  },
  exerciseWhy: {
    marginTop: 8,
    color: "rgba(95, 59, 43, 0.68)",
    fontFamily: sansFont,
    fontSize: typeScale.control,
    lineHeight: 18,
    fontWeight: "500",
  },
});
