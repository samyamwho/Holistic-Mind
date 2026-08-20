import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { appSansFont as sansFont, typeScale } from "../../../theme/typography";

type DailyCheckInCardProps = {
  isCompleteToday: boolean;
  onBegin: () => void;
};

export default function DailyCheckInCard({
  isCompleteToday,
  onBegin,
}: DailyCheckInCardProps) {
  return (
    <>
      <View style={styles.checkInCard}>
        <View style={styles.checkInArt}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require("../../../../assets/onboarding/dailycheckin.png")}
            style={styles.checkInImage}
          />
        </View>
        <Text style={styles.cardKicker}>Daily Check-In</Text>
        <Text style={styles.checkInTitle}>
          {isCompleteToday ? "You checked in today." : "How are you doing today?"}
        </Text>
        {isCompleteToday ? (
          <Text style={styles.checkInDoneText}>Your recommendations are ready below.</Text>
        ) : (
          <Pressable accessibilityRole="button" onPress={onBegin} style={styles.continueButton}>
            <Text style={styles.continueButtonText}>Check In</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.checkedInText}>
        {isCompleteToday
          ? "Your check-in is saved for today."
          : "Daily check-ins shape your recommendations."}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  checkInCard: {
    minHeight: 370,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  checkInArt: {
    width: 176,
    height: 146,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  checkInImage: {
    width: 220,
    height: 208,
  },

  cardKicker: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: sansFont,
    fontSize: typeScale.control,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  checkInTitle: {
    marginTop: 10,
    maxWidth: 280,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.heroTitle,
    lineHeight: typeScale.heroTitleLine,
    fontWeight: "600",
    textAlign: "center",
  },
  checkInDoneText: {
    marginTop: 14,
    color: "rgba(95, 59, 43, 0.64)",
    fontFamily: sansFont,
    fontSize: typeScale.body,
    lineHeight: typeScale.bodyLine,
    textAlign: "center",
  },
  continueButton: {
    minWidth: 188,
    height: 52,
    marginTop: 28,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.88)",
  },
  continueButtonText: {
    color: "#F6E3C5",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "900",
  },
  checkedInText: {
    marginTop: 18,
    marginBottom: 28,
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: sansFont,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center",
  },
});
