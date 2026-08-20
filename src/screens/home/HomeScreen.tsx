import React, { useCallback, useEffect, useRef, useState } from "react";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
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
import { UserRound } from "lucide-react-native";
import { dailyCheckInQuestions, exerciseLibrary } from "../../data/wellnessContent";
import { generateRecommendations } from "../../services/recommendations/recommendationApi";
import DailyCheckInCard from "./components/DailyCheckInCard";
import DailyCheckInFlow from "./components/DailyCheckInFlow";
import ProgressSummary from "./components/ProgressSummary";
import RecommendedTools from "./components/RecommendedTools";
import type {
  DailyCheckIn,
  DailyCheckInAnswers,
  Recommendation,
} from "../../types/wellness";
import { useAuth } from "../../context/AuthContext";
import {
  getLatestCheckIn,
  getPracticeEvents,
  saveCheckIn,
  subscribeToPracticeActivity,
  type PracticeActivity,
} from "../../services/wellness/wellnessApi";
import { appSansFont as sansFont, screenLayout, typeScale } from "../../theme/typography";

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRecommendationKey(checkIn: DailyCheckIn) {
  const answerFingerprint = dailyCheckInQuestions
    .map(({ id }) => `${id}:${checkIn.answers[id] ?? ""}`)
    .join("|");
  return `${checkIn.id}:${answerFingerprint}`;
}

function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { runAuthenticated, user } = useAuth();
  const [greeting, setGreeting] = useState(() => getTimeGreeting());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<DailyCheckInAnswers>>({});
  const [latestCheckIn, setLatestCheckIn] = useState<DailyCheckIn | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckInComplete, setIsCheckInComplete] = useState(false);
  const [isSavingCheckIn, setIsSavingCheckIn] = useState(false);
  const [checkInError, setCheckInError] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationRequestId, setRecommendationRequestId] = useState<string | null>(null);
  const [practiceEvents, setPracticeEvents] = useState<PracticeActivity[]>([]);
  const registeredRecommendationKey = useRef("");

  useEffect(() => subscribeToPracticeActivity((recorded) => {
    setPracticeEvents((current) =>
      current.some((event) => event.id === recorded.id)
        ? current
        : [recorded, ...current]
    );
  }), []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setGreeting(getTimeGreeting());
    runAuthenticated(async (token) => {
      const [checkIn, practiceEvents] = await Promise.all([
        getLatestCheckIn(token),
        getPracticeEvents(token),
      ]);
      if (active) {
        setLatestCheckIn(checkIn);
        setPracticeEvents((current) => {
          const fetchedIds = new Set(practiceEvents.map((event) => event.id));
          return [
            ...practiceEvents,
            ...current.filter((event) => !fetchedIds.has(event.id)),
          ];
        });
      }
    }).catch((error) => console.warn("Unable to load wellness data", error));
    return () => { active = false; };
  }, [runAuthenticated]));

  const supportsLiquidGlass =
    Platform.OS === "ios" &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();
  const openProfile = () => {
    navigation.navigate("Profile");
  };

  const todayKey = getLocalDateKey();
  const isCompleteToday = latestCheckIn?.date === todayKey;
  const exercisesDoneToday = practiceEvents.filter((event) =>
    event.kind === "exercise" &&
    getLocalDateKey(new Date(event.createdAt)) === todayKey
  ).length;
  const currentQuestion = dailyCheckInQuestions[currentIndex];
  const selectedAnswer = answers[currentQuestion.id];
  const visibleTools =
    isCompleteToday && recommendations.length > 0
      ? recommendations
      : exerciseLibrary.slice(0, 4);

  useEffect(() => {
    if (!isCompleteToday || !latestCheckIn) {
      setRecommendations([]);
      setRecommendationRequestId(null);
      return;
    }

    const recommendationKey = getRecommendationKey(latestCheckIn);
    if (registeredRecommendationKey.current === recommendationKey) {
      return;
    }
    registeredRecommendationKey.current = recommendationKey;

    runAuthenticated(generateRecommendations)
      .then((created) => {
        const generated = created.items.flatMap((item) => {
          const exercise = exerciseLibrary.find((candidate) => candidate.id === item.exerciseId);
          return exercise
            ? [{ ...exercise, why: item.reason, score: item.score }]
            : [];
        });
        setRecommendations(generated);
        setRecommendationRequestId(created.requestId);
      })
      .catch((error) => {
        registeredRecommendationKey.current = "";
        setRecommendations([]);
        setRecommendationRequestId(null);
        console.warn("Unable to register recommendations", error);
      });
  }, [
    isCompleteToday,
    latestCheckIn,
    runAuthenticated,
  ]);

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
    setCheckInError("");
    setIsCheckInComplete(false);
    setIsCheckingIn(true);
  };

  const goPrevious = () => {
    setCheckInError("");
    if (currentIndex === 0) {
      setIsCheckingIn(false);
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

      setCheckInError("");
      setIsSavingCheckIn(true);
      try {
        const saved = await runAuthenticated((token) => saveCheckIn(token, todayKey, completedAnswers));
        setLatestCheckIn(saved);
      } catch (error) {
        console.warn("Unable to save check-in", error);
        setCheckInError(error instanceof Error ? error.message : "Your check-in could not be saved. Please try again.");
        setIsSavingCheckIn(false);
        return;
      }
      setIsSavingCheckIn(false);
      setIsCheckInComplete(true);
      return;
    }

    setCheckInError("");
    setCurrentIndex((index) => index + 1);
  };

  const closeCheckIn = () => {
    if (isSavingCheckIn) return;
    setIsCheckingIn(false);
    setIsCheckInComplete(false);
  };

  const finishCheckIn = () => {
    setIsCheckingIn(false);
    setIsCheckInComplete(false);
    setCurrentIndex(0);
  };

  const resetForPreview = () => {
    setAnswers({});
    setCurrentIndex(0);
    setLatestCheckIn(null);
    setIsCheckingIn(false);
    setIsCheckInComplete(false);
    setIsSavingCheckIn(false);
    setCheckInError("");
    registeredRecommendationKey.current = "";
  };

  return (
    <View collapsable={false} style={styles.root}>
      <ImageBackground
        {...({ collapsable: false } as any)}
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView collapsable={false} style={styles.safeArea} edges={["top", "bottom"]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.dashboardContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.homeHeader}>
              <View style={styles.greetingCopy}>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text numberOfLines={1} style={styles.memberName}>
                  {user?.name || "Holistic Mind"}
                </Text>
              </View>

              <Pressable
                accessibilityHint="Opens your profile and settings"
                accessibilityLabel="Open profile"
                accessibilityRole="button"
                hitSlop={8}
                onPress={openProfile}
                style={styles.profileButton}
              >
                {supportsLiquidGlass ? (
                  <GlassView
                    glassEffectStyle="regular"
                    isInteractive
                    style={styles.profileButtonSurface}
                    tintColor="rgba(255, 248, 238, 0.18)"
                  >
                    <UserRound color="#673F3F" size={25} strokeWidth={2.2} />
                  </GlassView>
                ) : (
                  <View style={[styles.profileButtonSurface, styles.profileButtonFallback]}>
                    <UserRound color="#673F3F" size={25} strokeWidth={2.2} />
                  </View>
                )}
              </Pressable>
            </View>

            <DailyCheckInCard isCompleteToday={isCompleteToday} onBegin={beginCheckIn} />
            <RecommendedTools
              title={isCompleteToday ? "For you right now" : "Tools often recommended"}
              tools={visibleTools}
              onSelectTool={(exerciseId) =>
                navigation.navigate("Exercise", {
                  exerciseId,
                  recommendationRequestId: recommendationRequestId ?? undefined,
                })
              }
            />
            <ProgressSummary
              checkInsToday={isCompleteToday ? 1 : 0}
              exercisesDone={exercisesDoneToday}
            />

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
      <DailyCheckInFlow
        isComplete={isCheckInComplete}
        isSaving={isSavingCheckIn}
        onBack={goPrevious}
        onClose={closeCheckIn}
        onFinish={finishCheckIn}
        onNext={goNext}
        onSelect={selectAnswer}
        question={currentQuestion}
        questionIndex={currentIndex}
        saveError={checkInError}
        selectedAnswer={selectedAnswer}
        totalQuestions={dailyCheckInQuestions.length}
        visible={isCheckingIn}
      />
    </View>
  );
}

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
    paddingHorizontal: screenLayout.horizontalPadding,
    paddingTop: screenLayout.topPadding,
    paddingBottom: 122,
  },
  homeHeader: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 14,
  },
  greetingCopy: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    color: "rgba(95, 59, 43, 0.6)",
    fontFamily: sansFont,
    fontSize: typeScale.control,
    lineHeight: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  memberName: {
    marginTop: 2,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  profileButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileButtonSurface: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileButtonFallback: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.76)",
    backgroundColor: "rgba(255, 255, 255, 0.48)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  previewReset: {
    alignSelf: "center",
    marginTop: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewResetText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: typeScale.body,
    fontWeight: "700",
  },
});
