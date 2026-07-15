import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SlidersHorizontal } from "lucide-react-native";
import type { Exercise } from "../../../types/wellness";

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
            <Image source={exercise.image} resizeMode="contain" style={styles.exerciseImage} />
            <Text style={styles.exerciseCategory}>
              {exercise.section} · {exercise.duration}
            </Text>
            <Text style={styles.exerciseTitle}>{exercise.title}</Text>
            <Text style={styles.exerciseWhy}>{exercise.why}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

const interFont = Platform.select({
  ios: "Inter",
  android: "sans-serif",
  web: "Inter, system-ui, sans-serif",
  default: "sans-serif",
});

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
    fontFamily: interFont,
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
  },
  exerciseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  exerciseCard: {
    width: "47.8%",
    minHeight: 232,
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.58)",
  },
  exerciseImage: {
    width: "100%",
    height: 126,
    marginBottom: 10,
  },
  exerciseCategory: {
    color: "rgba(95, 59, 43, 0.66)",
    fontFamily: interFont,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  exerciseTitle: {
    marginTop: 4,
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
  },
  exerciseWhy: {
    marginTop: 8,
    color: "rgba(95, 59, 43, 0.68)",
    fontFamily: interFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
