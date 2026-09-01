import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import type { Exercise } from "../../../types/wellness";
import { appSansFont as sansFont, typeScale } from "../../../theme/typography";

type RecommendedToolsProps = {
  title: string;
  tools: Exercise[];
  onSelectTool: (exerciseId: string) => void;
};

export default function RecommendedTools({ title, tools, onSelectTool }: RecommendedToolsProps) {
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
});
