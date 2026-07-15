import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CalendarCheck2 } from "lucide-react-native";

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
      <View style={styles.homeHeader}>
        <View style={styles.checkInCount}>
          <CalendarCheck2 color="#5F3B2B" size={17} strokeWidth={2.4} />
          <Text style={styles.checkInCountText}>{isCompleteToday ? "1" : "0"}</Text>
        </View>
        <Text style={styles.greeting}>Welcome Back</Text>
      </View>

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

const interFont = Platform.select({
  ios: "Inter",
  android: "sans-serif",
  web: "Inter, system-ui, sans-serif",
  default: "sans-serif",
});

const styles = StyleSheet.create({
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  checkInCount: {
    minWidth: 78,
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255, 255, 255, 0.44)",
    borderWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.08)",
  },
  checkInCountText: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 20,
    fontWeight: "600",
  },
  greeting: {
    flex: 1,
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 27,
    lineHeight: 52,
    fontWeight: "600",
    letterSpacing: 0,
    textAlign: "right",
  },
  checkInCard: {
    minHeight: 420,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.72)",
    paddingHorizontal: 28,
    paddingVertical: 34,
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  checkInArt: {
    width: 196,
    height: 164,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  checkInImage: {
    width: 245,
    height: 232,
  },

  cardKicker: {
    color: "rgba(95, 59, 43, 0.54)",
    fontFamily: interFont,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  checkInTitle: {
    marginTop: 14,
    maxWidth: 280,
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 29,
    lineHeight: 42,
    fontWeight: "600",
    textAlign: "center",
  },
  checkInDoneText: {
    marginTop: 20,
    color: "rgba(95, 59, 43, 0.64)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  continueButton: {
    minWidth: 188,
    height: 58,
    marginTop: 38,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.88)",
  },
  continueButtonText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 18,
    fontWeight: "900",
  },
  checkedInText: {
    marginTop: 22,
    marginBottom: 32,
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
  },
});
