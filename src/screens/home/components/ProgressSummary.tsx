import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { appSansFont as sansFont, typeScale } from "../../../theme/typography";

type ProgressSummaryProps = {
  checkInsToday: number;
  exercisesDone: number;
};

export default function ProgressSummary({
  checkInsToday,
  exercisesDone,
}: ProgressSummaryProps) {
  return (
    <View style={styles.progressZone}>
      <Text style={styles.progressZoneTitle}>Your progress</Text>
      <View style={styles.progressStats}>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatValue}>{checkInsToday}</Text>
          <Text style={styles.progressStatLabel}>check-in today</Text>
        </View>
        <View style={styles.progressStat}>
          <Text style={styles.progressStatValue}>{exercisesDone}</Text>
          <Text style={styles.progressStatLabel}>exercises done</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressZone: {
    marginTop: 28,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.44)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.64)",
    padding: 18,
  },
  progressZoneTitle: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.sectionTitle,
    lineHeight: typeScale.sectionTitleLine,
    fontWeight: "800",
  },
  progressStats: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  progressStat: {
    flex: 1,
    minHeight: 86,
    borderRadius: 18,
    backgroundColor: "rgba(246, 227, 197, 0.52)",
    padding: 14,
    justifyContent: "center",
  },
  progressStatValue: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
  },
  progressStatLabel: {
    marginTop: 5,
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: sansFont,
    fontSize: typeScale.control,
    lineHeight: 18,
    fontWeight: "700",
  },
});
