import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  Check,
  ChevronLeft,
  Clock3,
  Film,
  Pause,
  Play,
  ShieldCheck,
  Volume2,
} from "lucide-react-native";
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { exerciseLibrary } from "../../data/wellnessContent";
import { getExerciseMedia } from "../../services/exercises/exerciseMediaApi";
import { getExerciseCatalogItem, type BackendExerciseCatalogItem } from "../../services/exercises/exerciseCatalogApi";
import {
  recordRecommendationEvent,
  saveRecommendationFeedback,
} from "../../services/recommendations/recommendationApi";
import type { Exercise, ExercisePhase } from "../../types/wellness";
import { useAuth } from "../../context/AuthContext";

type ExerciseScreenProps = {
  navigation: {
    goBack: () => void;
  };
  route: {
    params?: {
      exerciseId?: string;
      catalogId?: string;
      recommendationRequestId?: string;
    };
  };
};

type BreathingGuideProps = {
  isRunning: boolean;
  phases: ExercisePhase[];
};

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function BreathingGuide({ isRunning, phases }: BreathingGuideProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSeconds, setPhaseSeconds] = useState(phases[0]?.durationSeconds ?? 0);
  const scale = useSharedValue(0.68);
  const phase = phases[phaseIndex] ?? phases[0];

  useEffect(() => {
    setPhaseIndex(0);
    setPhaseSeconds(phases[0]?.durationSeconds ?? 0);
    scale.value = 0.68;
  }, [phases, scale]);

  useEffect(() => {
    if (!phase) {
      return;
    }

    if (!isRunning) {
      cancelAnimation(scale);
      return;
    }

    setPhaseSeconds(phase.durationSeconds);
    const durationMs = phase.durationSeconds * 1000;
    const isSecondInhale =
      phase.motion === "expand" &&
      phaseIndex > 0 &&
      phases[phaseIndex - 1]?.motion === "expand";
    const targetScale =
      phase.motion === "expand"
        ? isSecondInhale
          ? 1.06
          : 1
        : phase.motion === "contract"
          ? 0.68
          : scale.value;

    scale.value = withTiming(targetScale, {
      duration: durationMs,
      easing: Easing.inOut(Easing.sin),
    });

    const startedAt = Date.now();
    const countdown = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const secondsLeft = Math.max(1, Math.ceil((durationMs - elapsedMs) / 1000));
      setPhaseSeconds(secondsLeft);
    }, 200);
    const transition = setTimeout(() => {
      setPhaseIndex((index) => (index + 1) % phases.length);
    }, durationMs);

    return () => {
      clearInterval(countdown);
      clearTimeout(transition);
    };
  }, [isRunning, phase, phaseIndex, phases, scale]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.breathingStage}>
      <Animated.View style={[styles.breathingHalo, orbStyle]} />
      <View style={styles.breathingCore}>
        <Text style={styles.phaseLabel}>{isRunning ? phase?.label : "Ready"}</Text>
        <Text style={styles.phaseCount}>{isRunning ? phaseSeconds : ""}</Text>
      </View>
      <Text style={styles.phaseInstruction}>
        {isRunning ? phase?.instruction : "Begin whenever your body feels ready"}
      </Text>
    </View>
  );
}

function VideoGuide({ isRunning, videoUrl }: { isRunning: boolean; videoUrl: string }) {
  const player = useVideoPlayer(videoUrl, (createdPlayer) => {
    createdPlayer.loop = false;
  });

  useEffect(() => {
    if (isRunning) {
      player.play();
    } else {
      player.pause();
    }
  }, [isRunning, player]);

  return (
    <VideoView
      allowsFullscreen
      contentFit="contain"
      nativeControls
      player={player}
      style={styles.video}
    />
  );
}

function VisualGuide({ exercise, isLoadingVideo, hasVideo }: { exercise: Exercise; isLoadingVideo: boolean; hasVideo: boolean }) {
  const Icon = exercise.guidanceType === "audio" ? Volume2 : exercise.guidanceType === "video" ? Film : Play;

  return (
    <View style={styles.visualStage}>
      <Image source={exercise.image} resizeMode="contain" style={styles.exerciseImage} />
      <View style={styles.guideTypeBadge}>
        <Icon color="#673F3F" size={16} strokeWidth={2} />
        <Text style={styles.guideTypeText}>
          {exercise.guidanceType === "video"
            ? "Video guide"
            : exercise.guidanceType === "audio"
              ? "Audio guide"
              : "Guided practice"}
        </Text>
      </View>
      {exercise.guidanceType === "video" ? (
        <Text style={styles.mediaPending}>
          {isLoadingVideo ? "Loading demonstration video..." : hasVideo ? "Press Start practice to watch the demonstration." : "Demonstration video coming soon."}
        </Text>
      ) : null}
    </View>
  );
}

export default function ExerciseScreen({ navigation, route }: ExerciseScreenProps) {
  const { runAuthenticated } = useAuth();
  const libraryExercise = useMemo(
    () => exerciseLibrary.find((item) => item.id === route.params?.exerciseId),
    [route.params?.exerciseId]
  );
  const [remoteVideoUrl, setRemoteVideoUrl] = useState<string | null>(null);
  const [catalogExercise, setCatalogExercise] = useState<BackendExerciseCatalogItem | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [hasStartedVideo, setHasStartedVideo] = useState(false);
  const exercise = useMemo(
    () =>
      libraryExercise
        ? {
            ...libraryExercise,
            title: catalogExercise?.title ?? libraryExercise.title,
            why: catalogExercise?.description || libraryExercise.why,
            image: catalogExercise?.imageUrl ? { uri: catalogExercise.imageUrl } : libraryExercise.image,
            ...(remoteVideoUrl ? { videoUrl: remoteVideoUrl } : {}),
          }
        : libraryExercise,
    [catalogExercise, libraryExercise, remoteVideoUrl]
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(exercise?.durationSeconds ?? 0);
  const [submittedStateChange, setSubmittedStateChange] = useState<
    "better" | "same" | "worse" | null
  >(null);
  const openedRecorded = useRef(false);
  const startedRecorded = useRef(false);
  const completedRecorded = useRef(false);

  const recordEvent = useCallback(
    (eventType: "opened" | "started" | "completed" | "repeated") => {
      const requestId = route.params?.recommendationRequestId;
      const exerciseId = route.params?.exerciseId;
      if (!requestId || !exerciseId) {
        return;
      }
      runAuthenticated((token) =>
        recordRecommendationEvent(token, requestId, { exerciseId, eventType })
      ).catch((error) => console.warn(`Unable to record ${eventType} event`, error));
    },
    [
      route.params?.exerciseId,
      route.params?.recommendationRequestId,
      runAuthenticated,
    ]
  );

  useEffect(() => {
    if (openedRecorded.current || !exercise) {
      return;
    }
    openedRecorded.current = true;
    recordEvent("opened");
  }, [exercise, recordEvent]);

  useEffect(() => {
    if (!isComplete || completedRecorded.current) {
      return;
    }
    completedRecorded.current = true;
    recordEvent("completed");
  }, [isComplete, recordEvent]);

  useEffect(() => {
    const catalogId = route.params?.catalogId;
    if (!catalogId) { setCatalogExercise(null); return; }
    const controller = new AbortController();
    getExerciseCatalogItem(catalogId, controller.signal)
      .then(setCatalogExercise)
      .catch((error) => {
        if ((error as Error).name !== "AbortError") console.warn("Unable to refresh exercise details", error);
      });
    return () => controller.abort();
  }, [route.params?.catalogId]);

  useEffect(() => {
    setRemoteVideoUrl(null);
    setHasStartedVideo(false);

    if (!libraryExercise || libraryExercise.guidanceType !== "video") {
      setIsLoadingVideo(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    const timeout = setTimeout(() => controller.abort(), 6000);
    setIsLoadingVideo(true);

    getExerciseMedia(libraryExercise.id, controller.signal)
      .then((media) => {
        if (isActive) {
          setRemoteVideoUrl(media?.videoUrl ?? null);
        }
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          console.warn("Unable to load exercise video", error);
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (isActive) {
          setIsLoadingVideo(false);
        }
      });

    return () => {
      isActive = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [libraryExercise]);

  useEffect(() => {
    setIsRunning(false);
    setIsComplete(false);
    setRemainingSeconds(exercise?.durationSeconds ?? 0);
  }, [libraryExercise]);

  useEffect(() => {
    if (!isRunning || isComplete) {
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds > 1) {
          return seconds - 1;
        }

        setIsRunning(false);
        setIsComplete(true);
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isComplete, isRunning]);

  if (!exercise) {
    return (
      <SafeAreaView style={styles.missingState}>
        <Text style={styles.missingTitle}>Exercise not found</Text>
        <Pressable accessibilityRole="button" onPress={navigation.goBack} style={styles.missingButton}>
          <Text style={styles.missingButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const progress = 1 - remainingSeconds / exercise.durationSeconds;
  const guidanceLabel =
    exercise.guidanceType === "breathing"
      ? "Timed breathing"
      : exercise.guidanceType === "video"
        ? "Guided movement"
        : exercise.guidanceType === "grounding"
          ? "Grounding practice"
          : exercise.guidanceType === "audio"
            ? "Audio practice"
            : "Guided practice";

  const togglePractice = () => {
    if (isComplete) {
      recordEvent("repeated");
      setRemainingSeconds(exercise.durationSeconds);
      setIsComplete(false);
      completedRecorded.current = false;
      setSubmittedStateChange(null);
      setIsRunning(true);
      if (exercise.guidanceType === "video" && exercise.videoUrl) setHasStartedVideo(true);
      return;
    }

    if (!isRunning && !startedRecorded.current) {
      startedRecorded.current = true;
      recordEvent("started");
    }
    if (!isRunning && exercise.guidanceType === "video" && exercise.videoUrl) setHasStartedVideo(true);
    setIsRunning((running) => !running);
  };

  const finishPractice = () => {
    if (!startedRecorded.current) {
      startedRecorded.current = true;
      recordEvent("started");
    }
    setIsRunning(false);
    setRemainingSeconds(0);
    setIsComplete(true);
  };

  const submitStateChange = (stateChange: "better" | "same" | "worse") => {
    const requestId = route.params?.recommendationRequestId;
    const exerciseId = route.params?.exerciseId;
    if (!requestId || !exerciseId) {
      return;
    }
    setSubmittedStateChange(stateChange);
    runAuthenticated((token) =>
      saveRecommendationFeedback(token, requestId, {
        exerciseId,
        stateChange,
        helpfulness: stateChange === "better" ? 3 : stateChange === "same" ? 1 : 0,
        uncomfortable: false,
      })
    ).catch((error) => {
      setSubmittedStateChange(null);
      console.warn("Unable to save recommendation feedback", error);
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ImageBackground
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.topBar}>
              <Pressable
                accessibilityLabel="Go back"
                accessibilityRole="button"
                hitSlop={10}
                onPress={navigation.goBack}
                style={styles.iconButton}
              >
                <ChevronLeft color="#5F3B2B" size={26} strokeWidth={2.2} />
              </Pressable>

              <View style={styles.durationBadge}>
                <Clock3 color="#673F3F" size={16} strokeWidth={2} />
                <Text style={styles.durationText}>{exercise.duration}</Text>
              </View>
            </View>

            <Text style={styles.eyebrow}>{exercise.section}</Text>
            <Text style={styles.title}>{exercise.title}</Text>
            <Text style={styles.why}>{exercise.why}</Text>

            <View style={styles.mediaShell}>
              <LinearGradient
                colors={["rgba(255,255,255,0.7)", exercise.color, "rgba(255,255,255,0.26)"]}
                start={{ x: 0.08, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.mediaSurface}
              >
                {exercise.guidanceType === "breathing" && exercise.phases ? (
                  <BreathingGuide isRunning={isRunning} phases={exercise.phases} />
                ) : exercise.guidanceType === "video" && exercise.videoUrl && hasStartedVideo ? (
                  <VideoGuide isRunning={isRunning} videoUrl={exercise.videoUrl} />
                ) : (
                  <VisualGuide exercise={exercise} isLoadingVideo={isLoadingVideo} hasVideo={Boolean(exercise.videoUrl)} />
                )}
              </LinearGradient>
            </View>

            <View style={styles.playerStatus}>
              <View style={styles.playerStatusRow}>
                <Text style={styles.playerMode}>{guidanceLabel}</Text>
                <Text style={styles.playerTime}>
                  {isComplete ? "Complete" : formatTime(remainingSeconds)}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max(progress, 0) * 100}%` }]} />
              </View>
            </View>

            <View style={styles.controlRow}>
              <Pressable
                accessibilityRole="button"
                onPress={togglePractice}
                style={[styles.primaryButton, isComplete && styles.completeButton]}
              >
                {isComplete ? (
                  <Check color="#FFF8EE" size={21} strokeWidth={2.5} />
                ) : isRunning ? (
                  <Pause color="#FFF8EE" fill="#FFF8EE" size={19} strokeWidth={2} />
                ) : (
                  <Play color="#FFF8EE" fill="#FFF8EE" size={19} strokeWidth={2} />
                )}
                <Text style={styles.primaryButtonText}>
                  {isComplete ? "Practice again" : isRunning ? "Pause" : "Start practice"}
                </Text>
              </Pressable>

              {!isComplete ? (
                <Pressable accessibilityRole="button" onPress={finishPractice} style={styles.doneButton}>
                  <Check color="#673F3F" size={21} strokeWidth={2.5} />
                </Pressable>
              ) : null}
            </View>

            {isComplete && route.params?.recommendationRequestId ? (
              <View style={styles.feedbackCard}>
                <Text style={styles.feedbackTitle}>How do you feel now?</Text>
                <Text style={styles.feedbackSubtitle}>
                  Your answer helps future recommendations learn what supports you.
                </Text>
                <View style={styles.feedbackOptions}>
                  {([
                    ["better", "Better"],
                    ["same", "About the same"],
                    ["worse", "Worse"],
                  ] as const).map(([value, label]) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: submittedStateChange === value }}
                      key={value}
                      onPress={() => submitStateChange(value)}
                      style={[
                        styles.feedbackOption,
                        submittedStateChange === value && styles.feedbackOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.feedbackOptionText,
                          submittedStateChange === value && styles.feedbackOptionTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.instructionsSection}>
              <Text style={styles.sectionTitle}>How to practice</Text>
              {exercise.steps.map((step, index) => (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {exercise.safetyNote ? (
              <View style={styles.safetyRow}>
                <ShieldCheck color="#673F3F" size={21} strokeWidth={2} />
                <Text style={styles.safetyText}>{exercise.safetyNote}</Text>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const sansFont = Platform.select({
  ios: "Helvetica Neue",
  android: "sans-serif",
  web: "Helvetica Neue, Helvetica, Arial, sans-serif",
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
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 48,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  durationBadge: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 13,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.58)",
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  durationText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  eyebrow: {
    color: "rgba(95,59,43,0.62)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    marginTop: 7,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
  },
  why: {
    marginTop: 10,
    color: "rgba(95,59,43,0.72)",
    fontFamily: sansFont,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "500",
  },
  mediaShell: {
    marginTop: 24,
    borderRadius: 26,
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 5,
  },
  mediaSurface: {
    minHeight: 330,
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.66)",
  },
  breathingStage: {
    minHeight: 328,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  breathingHalo: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderColor: "rgba(103,63,63,0.16)",
    backgroundColor: "rgba(223,162,177,0.38)",
    shadowColor: "#DFA2B1",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
  },
  breathingCore: {
    width: 138,
    height: 138,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 69,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.62)",
  },
  phaseLabel: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 22,
    fontWeight: "700",
  },
  phaseCount: {
    minHeight: 28,
    marginTop: 2,
    color: "rgba(103,63,63,0.64)",
    fontFamily: sansFont,
    fontSize: 22,
    fontWeight: "500",
  },
  phaseInstruction: {
    position: "absolute",
    bottom: 24,
    left: 24,
    right: 24,
    color: "rgba(95,59,43,0.72)",
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  visualStage: {
    minHeight: 328,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  exerciseImage: {
    width: "82%",
    height: 222,
  },
  guideTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.64)",
  },
  guideTypeText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  mediaPending: {
    marginTop: 8,
    color: "rgba(95,59,43,0.56)",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "500",
  },
  video: {
    width: "100%",
    height: 520,
    alignSelf: "stretch",
    backgroundColor: "#201B19",
  },
  playerStatus: {
    marginTop: 19,
  },
  playerStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  playerMode: {
    color: "rgba(95,59,43,0.62)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  playerTime: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "rgba(95,59,43,0.12)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#DFA2B1",
  },
  controlRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    minHeight: 56,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 28,
    backgroundColor: "#673F3F",
  },
  completeButton: {
    backgroundColor: "#6F7F62",
  },
  feedbackCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.66)",
  },
  feedbackTitle: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 18,
    fontWeight: "700",
  },
  feedbackSubtitle: {
    marginTop: 5,
    color: "rgba(95, 59, 43, 0.7)",
    fontFamily: sansFont,
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  feedbackOption: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255, 248, 238, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(103, 63, 63, 0.18)",
  },
  feedbackOptionSelected: {
    backgroundColor: "#673F3F",
    borderColor: "#673F3F",
  },
  feedbackOptionText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  feedbackOptionTextSelected: {
    color: "#FFF8EE",
  },
  primaryButtonText: {
    color: "#FFF8EE",
    fontFamily: sansFont,
    fontSize: 16,
    fontWeight: "700",
  },
  doneButton: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.64)",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  instructionsSection: {
    marginTop: 34,
  },
  sectionTitle: {
    marginBottom: 17,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "700",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 13,
    marginBottom: 16,
  },
  stepNumber: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: "rgba(223,162,177,0.3)",
  },
  stepNumberText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    paddingTop: 3,
    color: "rgba(95,59,43,0.78)",
    fontFamily: sansFont,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
  },
  safetyRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "rgba(95,59,43,0.12)",
  },
  safetyText: {
    flex: 1,
    color: "rgba(95,59,43,0.68)",
    fontFamily: sansFont,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  missingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F6E3C5",
  },
  missingTitle: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 22,
    fontWeight: "700",
  },
  missingButton: {
    marginTop: 20,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#673F3F",
    paddingHorizontal: 24,
  },
  missingButtonText: {
    color: "#FFF8EE",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "700",
  },
});
