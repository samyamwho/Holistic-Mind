import React from "react";
import { ImageBackground, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileSection() {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.content}>
            <Text style={styles.kicker}>Settings</Text>
            <Text style={styles.title}>Profile</Text>
            <View style={styles.panel}>
              <Text style={styles.panelText}>Onboarding answers, activity, subscription, and privacy controls will live here.</Text>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const serifFont = Platform.select({
  ios: "Times New Roman",
  android: "serif",
  web: "Times New Roman",
  default: "serif",
});

const interFont = Platform.select({
  ios: "Inter",
  android: "sans-serif",
  web: "Inter, system-ui, sans-serif",
  default: "sans-serif",
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6E3C5",
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 122,
  },
  kicker: {
    color: "#673F3F",
    fontFamily: interFont,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 10,
    color: "#5F3B2B",
    fontFamily: serifFont,
    fontSize: 52,
    fontStyle: "italic",
    lineHeight: 58,
  },
  panel: {
    marginTop: 28,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.08)",
    padding: 20,
  },
  panelText: {
    color: "rgba(95, 59, 43, 0.72)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 22,
  },
});
