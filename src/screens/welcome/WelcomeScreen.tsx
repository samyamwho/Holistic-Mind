import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

type WelcomeScreenProps = {
  navigation: {
    replace: (screen: string) => void;
  };
};

export default function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 760,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ImageBackground
        source={require("../../../assets/welcome/yoga-background.jpg")}
        resizeMode="cover"
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        {/* <LinearGradient
          colors={[
            "rgba(95, 59, 43, 0.16)",
            "rgba(103, 63, 63, 0.2)",
            "rgba(95, 59, 43, 0.78)",
            "rgba(95, 59, 43, 0.96)",
          ]}
          locations={[0, 0.42, 0.76, 1]}
          style={styles.overlay}
        /> */}

        <LinearGradient
          colors={["rgba(246, 227, 197, 0.3)", "rgba(223, 162, 177, 0)"]}
          style={styles.topGlow}
        />

        <View style={styles.content}>
          <View style={styles.topPill}>
            <View style={styles.pillDot} />
            <Text style={styles.pillText}>Mindful support for today</Text>
          </View>

          <Animated.View
            style={[
              styles.bottomContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.brand}>Holistic Mind</Text>
            <Text style={styles.tagline}>Find your calm, one check-in at a time.</Text>

            <View style={styles.ruleRow}>
              <View style={styles.rule} />
              <View style={styles.ruleDot} />
              <View style={styles.rule} />
            </View>

            <Text style={styles.description}>
              Trauma-informed tools for breathwork, grounding, and mindful
              reflection between life’s heavier moments.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.replace("MainTabs")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Start your journey now</Text>
            </Pressable>

            <Text style={styles.loginText}>
              Don't have an account? <Text style={styles.loginLink}>Sign up</Text>
            </Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </SafeAreaView>
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
  safeArea: {
    flex: 1,
    backgroundColor: "#5F3B2B",
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    transform: [{ translateY: -120 }, { scale: 1.4 }],
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 26,
    paddingTop: 18,
    paddingBottom: 16,
  },
  topPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "rgba(95, 59, 43, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(246, 227, 197, 0.38)",
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#DFA2B1",
  },
  pillText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  bottomContent: {
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 120,
  },
  brand: {
    color: "#F6E3C5",
    fontFamily: serifFont,
    fontSize: 50,
    fontStyle: "italic",
    fontWeight: "400",
    lineHeight: 56,
    letterSpacing: 0,
    textAlign: "center",
    textShadowColor: "rgba(95, 59, 43, 0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    marginTop: 2,
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
    textAlign: "center",
    textShadowColor: "rgba(95, 59, 43, 0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    marginBottom: 14,
  },
  rule: {
    width: 54,
    height: 1,
    backgroundColor: "rgba(246, 227, 197, 0.48)",
  },
  ruleDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DFA2B1",
  },
  description: {
    maxWidth: 304,
    color: "rgba(246, 227, 197, 0.86)",
    fontFamily: interFont,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    textShadowColor: "rgba(95, 59, 43, 0.85)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    top: 20,
  },
  primaryButton: {
    width: "70%",
    height: 56,
    marginTop: 50,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.19)",
    borderWidth: 1,
    borderColor: "rgba(246, 227, 197, 0.39)",
    shadowColor: "#2f1c15",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.42,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 10,
  },
  primaryButtonText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  loginText: {
    marginTop: 14,
    color: "rgba(246, 227, 197, 0.74)",
    fontFamily: interFont,
    fontSize: 13,
  },
  loginLink: {
    color: "#DFA2B1",
    fontWeight: "800",
  },
});
