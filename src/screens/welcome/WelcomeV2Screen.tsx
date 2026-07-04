import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WelcomeV2ScreenProps = {
  navigation: {
    replace: (screen: string) => void;
    navigate: (screen: string) => void;
  };
};

export default function WelcomeV2Screen({ navigation }: WelcomeV2ScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, floatAnim]);

  const floatingStyle = {
    transform: [
      {
        translateY: floatAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10],
        }),
      },
    ],
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.content}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Come back to your body</Text>
          </View>

          <Animated.View style={[styles.artWrap, floatingStyle]}>
            <Image
              source={require("../../../assets/welcome/line-body.png")}
              resizeMode="contain"
              style={styles.lineArt}
            />
          </Animated.View>

          <Animated.View style={[styles.copyWrap, { opacity: fadeAnim }]}>
            <Text style={styles.headlineIntro}>Welcome to</Text>
            <Text style={styles.headlineBrand}>Holistic Mind</Text>
            <Text style={styles.subhead}>
              Gentle check-ins, breathwork, and grounding tools for calmer
              moments between sessions.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate("Login")}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Begin</Text>
            </Pressable>

            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
                Log in
              </Text>
            </Text>
          </Animated.View>
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
    paddingTop: 18,
    paddingBottom: 24,
  },
  statusPill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    backgroundColor: "rgba(95, 59, 43, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#DFA2B1",
  },
  statusText: {
    color: "#673F3F",
    fontFamily: interFont,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  artWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  lineArt: {
    width: 418,
    height: 418,
    top: -20,
  },
  copyWrap: {
    alignItems: "center",
  },
  headlineIntro: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: 0,
    top: -50,
  },
  headlineBrand: {
    color: "#5F3B2B",
    fontFamily: serifFont,
    fontSize: 52,
    fontStyle: "italic",
    fontWeight: "400",
    lineHeight: 58,
    textAlign: "center",
    letterSpacing: 0,
    top: -50,
  },
  subhead: {
    marginTop: 14,
    maxWidth: 316,
    color: "#673F3F",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    top: -30,
  },
  primaryButton: {
    width: "80%",
    height: 56,
    marginTop: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(246, 227, 197, 0.72)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
    top: -20,
  },
  primaryButtonText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  loginText: {
    marginTop: 18,
    color: "rgba(95, 59, 43, 0.72)",
    fontFamily: interFont,
    fontSize: 13,
  },
  loginLink: {
    color: "#673F3F",
    fontWeight: "900",
  },
});
