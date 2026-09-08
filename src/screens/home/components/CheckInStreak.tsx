import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Flame, X } from "lucide-react-native";
import { appSansFont as sansFont } from "../../../theme/typography";

type CheckInStreakProps = {
  isCompleteToday: boolean;
  streak: number;
};

export default function CheckInStreak({ isCompleteToday, streak }: CheckInStreakProps) {
  const [visible, setVisible] = useState(false);
  const isActive = streak > 0;
  const status = isCompleteToday
    ? "Today is already part of your streak. Come back tomorrow for the next gentle check-in."
    : streak > 0
      ? "Check in today to keep your streak going."
      : "Complete today's check-in to begin a new streak.";

  return (
    <>
      <Pressable
        accessibilityHint="Shows details about your daily check-in streak"
        accessibilityLabel={`${streak} day check-in streak`}
        accessibilityRole="button"
        hitSlop={6}
        onPress={() => setVisible(true)}
        style={[styles.trigger, isActive && styles.triggerActive]}
      >
        <Flame
          color={isActive ? "#C76538" : "rgba(95, 59, 43, 0.42)"}
          fill={isActive ? "rgba(231, 133, 76, 0.22)" : "transparent"}
          size={21}
          strokeWidth={2.1}
        />
        <Text style={[styles.triggerCount, isActive && styles.triggerCountActive]}>{streak}</Text>
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <Pressable onPress={() => setVisible(false)} style={styles.backdrop}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <Pressable
              accessibilityLabel="Close streak details"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setVisible(false)}
              style={styles.closeButton}
            >
              <X color="#673F3F" size={19} />
            </Pressable>

            <View style={[styles.flameCircle, isActive && styles.flameCircleActive]}>
              <Flame
                color={isActive ? "#C76538" : "rgba(95, 59, 43, 0.40)"}
                fill={isActive ? "rgba(231, 133, 76, 0.24)" : "transparent"}
                size={34}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.kicker}>Daily check-in streak</Text>
            <Text style={styles.count}>{streak}</Text>
            <Text style={styles.dayLabel}>{streak === 1 ? "day" : "days"}</Text>
            <Text style={styles.status}>{status}</Text>
            <View style={styles.note}>
              <Text style={styles.noteText}>
                A streak grows when you check in on consecutive days. If a full day is missed, the count starts again—without judgement.
              </Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 48,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 9,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.68)",
    backgroundColor: "rgba(255, 255, 255, 0.38)",
  },
  triggerActive: {
    borderColor: "rgba(231, 133, 76, 0.20)",
    backgroundColor: "rgba(255, 244, 225, 0.68)",
  },
  triggerCount: {
    color: "rgba(95, 59, 43, 0.48)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "800",
  },
  triggerCountActive: {
    color: "#9A4F2E",
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 18,
    backgroundColor: "rgba(50, 35, 29, 0.34)",
  },
  sheet: {
    alignItems: "center",
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 26,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
  },
  closeButton: {
    position: "absolute",
    right: 18,
    top: 18,
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(95, 59, 43, 0.07)",
  },
  flameCircle: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 34,
    backgroundColor: "rgba(95, 59, 43, 0.06)",
  },
  flameCircleActive: {
    backgroundColor: "rgba(231, 133, 76, 0.13)",
  },
  kicker: {
    marginTop: 15,
    color: "rgba(95, 59, 43, 0.55)",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  count: {
    marginTop: 7,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 44,
    lineHeight: 48,
    fontWeight: "700",
  },
  dayLabel: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  status: {
    maxWidth: 310,
    marginTop: 14,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  note: {
    width: "100%",
    marginTop: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(246, 227, 197, 0.34)",
  },
  noteText: {
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: sansFont,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
});
