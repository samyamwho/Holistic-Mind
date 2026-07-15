import React, { useCallback, useMemo, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { dailyCheckInQuestions, exerciseLibrary } from "../../data/wellnessContent";
import { getRecommendations } from "../../services/recommendations/recommendationEngine";
import DailyCheckInCard from "./components/DailyCheckInCard";
import ProgressSummary from "./components/ProgressSummary";
import RecommendedTools from "./components/RecommendedTools";
import type {
  DailyCheckIn,
  DailyCheckInAnswers,
} from "../../types/wellness";
import { useAuth } from "../../context/AuthContext";
import { getJournalEntries, getLatestCheckIn, getOnboardingResponses, saveCheckIn } from "../../services/wellness/wellnessApi";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { runAuthenticated } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<DailyCheckInAnswers>>({});
  const [latestCheckIn, setLatestCheckIn] = useState<DailyCheckIn | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [onboardingSupport, setOnboardingSupport] = useState("");

  useFocusEffect(useCallback(() => {
    let active = true;
    runAuthenticated(async (token) => {
      const [checkIn, entries, onboarding] = await Promise.all([
        getLatestCheckIn(token),
        getJournalEntries(token),
        getOnboardingResponses(token),
      ]);
      if (active) {
        setLatestCheckIn(checkIn);
        setJournalText(entries.slice(0, 10).map((entry) => entry.text).join(" "));
        setOnboardingSupport(onboarding?.support ?? "");
      }
    }).catch((error) => console.warn("Unable to load wellness data", error));
    return () => { active = false; };
  }, [runAuthenticated]));

  const todayKey = getTodayKey();
  const isCompleteToday = latestCheckIn?.date === todayKey;
  const currentQuestion = dailyCheckInQuestions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];
  const progress = useMemo(
    () => (currentIndex + 1) / dailyCheckInQuestions.length,
    [currentIndex]
  );
  const recommendations = useMemo(
    () => getRecommendations(latestCheckIn?.answers ?? answers, journalText, onboardingSupport),
    [answers, journalText, latestCheckIn, onboardingSupport]
  );
  const visibleTools = isCompleteToday ? recommendations : exerciseLibrary.slice(0, 4);

  const selectAnswer = (answer: string) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [currentQuestion.id]: answer,
    }));
  };

  const beginCheckIn = () => {
    if (isCompleteToday) {
      return;
    }

    setAnswers({});
    setCurrentIndex(0);
    setIsCheckingIn(true);
  };

  const goPrevious = () => {
    if (currentIndex <= 1) {
      setIsCheckingIn(false);
      setCurrentIndex(0);
      return;
    }

    setCurrentIndex((index) => index - 1);
  };

  const goNext = async () => {
    if (!selectedAnswer) {
      return;
    }

    if (currentIndex === dailyCheckInQuestions.length - 1) {
      const completedAnswers = answers as DailyCheckInAnswers;

      try {
        const saved = await runAuthenticated((token) => saveCheckIn(token, todayKey, completedAnswers));
        setLatestCheckIn(saved);
      } catch (error) {
        console.warn("Unable to save check-in", error);
        return;
      }
      setIsCheckingIn(false);
      return;
    }

    setCurrentIndex((index) => index + 1);
  };

  const resetForPreview = () => {
    setAnswers({});
    setCurrentIndex(0);
    setLatestCheckIn(null);
    setIsCheckingIn(false);
  };

  if (isCheckingIn) {
    return (
      <View style={styles.root}>
        <ImageBackground
          source={require("../../../assets/welcome/paper-background.png")}
          resizeMode="cover"
          style={styles.background}
        >
          <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.questionCardShell}>
                <LinearGradient
                  colors={[
                    "rgba(255, 255, 255, 0.68)",
                    "rgba(255, 250, 243, 0.38)",
                    "rgba(255, 255, 255, 0.22)",
                  ]}
                  start={{ x: 0.08, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.questionCard}
                >
                  <View pointerEvents="none" style={styles.glassHighlight} />
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>
                      Question {currentIndex + 1} of {dailyCheckInQuestions.length}
                    </Text>
                    <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>

                  <Text style={styles.question}>{currentQuestion.question}</Text>

                  <View style={styles.optionGrid}>
                    {currentQuestion.options.map((option) => {
                      const isSelected = selectedAnswer === option;

                      return (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          key={option}
                          onPress={() => selectAnswer(option)}
                          style={[
                            styles.optionChip,
                            isSelected && styles.optionChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              isSelected && styles.optionTextSelected,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.navigationRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={goPrevious}
                      style={styles.roundButton}
                    >
                      <Text style={styles.roundButtonText}>‹</Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !selectedAnswer }}
                      disabled={!selectedAnswer}
                      onPress={goNext}
                      style={[
                        styles.nextButton,
                        !selectedAnswer && styles.nextButtonDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.nextButtonText,
                          !selectedAnswer && styles.nextButtonTextDisabled,
                        ]}
                      >
                        {currentIndex === dailyCheckInQuestions.length - 1 ? "Finish" : "Next"}
                      </Text>
                    </Pressable>
                  </View>
                </LinearGradient>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <ScrollView
            contentContainerStyle={styles.dashboardContent}
            showsVerticalScrollIndicator={false}
          >
            <DailyCheckInCard isCompleteToday={isCompleteToday} onBegin={beginCheckIn} />
            <RecommendedTools
              title={isCompleteToday ? "For you right now" : "Tools often recommended"}
              tools={visibleTools}
              onSelectTool={(exerciseId) => navigation.navigate("Exercise", { exerciseId })}
            />
            <ProgressSummary checkInsToday={isCompleteToday ? 1 : 0} exercisesDone={0} />

            {isCompleteToday ? (
              <Pressable
                accessibilityRole="button"
                onPress={resetForPreview}
                style={styles.previewReset}
              >
                <Text style={styles.previewResetText}>Reset preview</Text>
              </Pressable>
            ) : null}
          </ScrollView>
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
  dashboardContent: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 122,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 142,
  },
  previewReset: {
    alignSelf: "center",
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewResetText: {
    color: "#673F3F",
    fontFamily: interFont,
    fontSize: 14,
    fontWeight: "700",
  },
  questionCardShell: {
    borderRadius: 32,
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 7,
  },
  questionCard: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.56)",
    borderRadius: 32,
    overflow: "hidden",
    padding: 24,
  },
  glassHighlight: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 96,
    borderTopLeftRadius: 31,
    borderTopRightRadius: 31,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressLabel: {
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: interFont,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0,
  },
  progressPercent: {
    color: "#673F3F",
    fontFamily: interFont,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
  },
  progressTrack: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "rgba(95, 59, 43, 0.11)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: "#DFA2B1",
  },
  question: {
    marginTop: 34,
    color: "#5F3B2B",
    fontFamily: serifFont,
    fontSize: 34,
    fontStyle: "italic",
    lineHeight: 40,
    fontWeight: "400",
    letterSpacing: 0,
  },
  optionGrid: {
    marginTop: 26,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionChip: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.52)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  optionChipSelected: {
    backgroundColor: "rgba(95, 59, 43, 0.82)",
    borderColor: "rgba(95, 59, 43, 0.16)",
  },
  optionText: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0,
  },
  optionTextSelected: {
    color: "#F6E3C5",
    fontWeight: "800",
  },
  navigationRow: {
    marginTop: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.54)",
  },
  roundButtonText: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "300",
  },
  nextButton: {
    minWidth: 128,
    minHeight: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.88)",
    paddingHorizontal: 24,
  },
  nextButtonDisabled: {
    backgroundColor: "rgba(95, 59, 43, 0.24)",
  },
  nextButtonText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0,
  },
  nextButtonTextDisabled: {
    color: "rgba(246, 227, 197, 0.72)",
  },
});
