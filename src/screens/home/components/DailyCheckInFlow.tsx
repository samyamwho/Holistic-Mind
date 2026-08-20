import React, { useEffect, useRef } from "react";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import {
  Activity,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudFog,
  CloudLightning,
  Footprints,
  Frown,
  Gauge,
  Leaf,
  Meh,
  Minus,
  ScanSearch,
  Shuffle,
  Smile,
  Sparkles,
  Target,
  Weight,
  Wind,
  X,
  Zap,
} from "lucide-react-native";
import {
  ActivityIndicator,
  Animated,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { CheckInQuestion } from "../../../types/wellness";
import { appSansFont as sansFont, typeScale } from "../../../theme/typography";

type DailyCheckInFlowProps = {
  isComplete: boolean;
  isSaving: boolean;
  onBack: () => void;
  onClose: () => void;
  onFinish: () => void;
  onNext: () => void;
  onSelect: (answer: string) => void;
  question: CheckInQuestion;
  questionIndex: number;
  saveError?: string;
  selectedAnswer?: string;
  totalQuestions: number;
  visible: boolean;
};

const questionHints: Record<CheckInQuestion["id"], string> = {
  state: "Choose the expression that feels closest.",
  body: "Notice sensation without needing to change it.",
  energy: "Choose where your energy sits right now.",
  stress: "There is no right answer—just what is true today.",
  focus: "How available does your attention feel?",
  support: "We’ll use this to shape your recommendations.",
};

function AnswerIcon({
  answer,
  color,
  questionId,
  size = 27,
}: {
  answer: string;
  color: string;
  questionId: CheckInQuestion["id"];
  size?: number;
}) {
  const props = { color, size, strokeWidth: 1.9 };

  if (questionId === "state") {
    if (answer === "Overwhelmed") return <CloudLightning {...props} />;
    if (answer === "Anxious") return <Frown {...props} />;
    if (answer === "Numb") return <Minus {...props} />;
    if (answer === "Okay") return <Meh {...props} />;
    return <Smile {...props} />;
  }

  if (questionId === "body") {
    if (answer === "Relaxed") return <Leaf {...props} />;
    if (answer === "Tense") return <Activity {...props} />;
    if (answer === "Heavy") return <Weight {...props} />;
    if (answer === "Restless") return <Zap {...props} />;
    return <CloudFog {...props} />;
  }

  if (questionId === "energy") {
    if (answer === "High") return <BatteryFull {...props} />;
    if (answer === "Steady") return <BatteryMedium {...props} />;
    if (answer === "Tired") return <BatteryLow {...props} />;
    return <BatteryWarning {...props} />;
  }

  if (questionId === "focus") {
    if (answer === "Clear") return <Target {...props} />;
    if (answer === "Scattered") return <Shuffle {...props} />;
    if (answer === "Foggy") return <CloudFog {...props} />;
    return <ScanSearch {...props} />;
  }

  if (questionId === "support") {
    if (answer === "Calm down") return <Wind {...props} />;
    if (answer === "Feel grounded") return <Footprints {...props} />;
    if (answer === "Get energy") return <Zap {...props} />;
    if (answer === "Focus") return <Target {...props} />;
    return <BookOpen {...props} />;
  }

  if (answer === "Not stressed") return <Leaf {...props} />;
  if (answer === "A little") return <Gauge {...props} />;
  if (answer === "Moderate") return <Activity {...props} />;
  return <CloudLightning {...props} />;
}

function MoodOptions({
  onSelect,
  options,
  selectedAnswer,
}: {
  onSelect: (answer: string) => void;
  options: string[];
  selectedAnswer?: string;
}) {
  return (
    <View style={styles.moodRow}>
      {options.map((option) => {
        const selected = option === selectedAnswer;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onSelect(option)}
            style={styles.moodOption}
          >
            <View style={[styles.moodCircle, selected && styles.moodCircleSelected]}>
              <AnswerIcon
                answer={option}
                color={selected ? "#6F5751" : "rgba(95,59,43,0.66)"}
                questionId="state"
                size={24}
              />
            </View>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.76}
              numberOfLines={1}
              style={[styles.moodLabel, selected && styles.moodLabelSelected]}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ScaleOptions({
  onSelect,
  question,
  selectedAnswer,
}: {
  onSelect: (answer: string) => void;
  question: CheckInQuestion;
  selectedAnswer?: string;
}) {
  const selectedIndex = question.options.findIndex((option) => option === selectedAnswer);

  return (
    <View style={styles.scaleControl}>
      <View pointerEvents="none" style={styles.scaleTrack} />
      {question.options.map((option, index) => {
        const selected = option === selectedAnswer;
        const passed = selectedIndex >= 0 && index <= selectedIndex;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onSelect(option)}
            style={styles.scaleOption}
          >
            <View style={[styles.scaleNode, passed && styles.scaleNodePassed, selected && styles.scaleNodeSelected]}>
              <AnswerIcon
                answer={option}
                color={selected ? "#6F5751" : passed ? "rgba(95,59,43,0.6)" : "rgba(95,59,43,0.4)"}
                questionId={question.id}
                size={selected ? 22 : 18}
              />
            </View>
            <Text style={[styles.scaleLabel, selected && styles.scaleLabelSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CardOptions({
  onSelect,
  question,
  selectedAnswer,
}: {
  onSelect: (answer: string) => void;
  question: CheckInQuestion;
  selectedAnswer?: string;
}) {
  return (
    <View style={styles.cardGrid}>
      {question.options.map((option) => {
        const selected = option === selectedAnswer;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.answerCard, selected && styles.answerCardSelected]}
          >
            <View style={[styles.answerIcon, selected && styles.answerIconSelected]}>
              <AnswerIcon
                answer={option}
                color={selected ? "#6F5751" : "rgba(95,59,43,0.66)"}
                questionId={question.id}
              />
            </View>
            <Text style={[styles.answerLabel, selected && styles.answerLabelSelected]}>{option}</Text>
            {selected ? (
              <View style={styles.selectedCheck}>
                <Check color="#76615B" size={12} strokeWidth={2.4} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function QuestionOptions({
  onSelect,
  question,
  selectedAnswer,
}: {
  onSelect: (answer: string) => void;
  question: CheckInQuestion;
  selectedAnswer?: string;
}) {
  if (question.id === "state") {
    return <MoodOptions onSelect={onSelect} options={question.options} selectedAnswer={selectedAnswer} />;
  }

  if (question.id === "energy" || question.id === "stress") {
    return <ScaleOptions onSelect={onSelect} question={question} selectedAnswer={selectedAnswer} />;
  }

  return <CardOptions onSelect={onSelect} question={question} selectedAnswer={selectedAnswer} />;
}

export default function DailyCheckInFlow({
  isComplete,
  isSaving,
  onBack,
  onClose,
  onFinish,
  onNext,
  onSelect,
  question,
  questionIndex,
  saveError,
  selectedAnswer,
  totalQuestions,
  visible,
}: DailyCheckInFlowProps) {
  const entrance = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const supportsLiquidGlass =
    Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const topInset = Math.max(insets.top, Platform.OS === "ios" ? 54 : 24);
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 28 : 16);

  useEffect(() => {
    entrance.setValue(0);
    Animated.spring(entrance, {
      damping: 18,
      mass: 0.8,
      stiffness: 150,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance, questionIndex, isComplete]);

  const animatedStyle = {
    opacity: entrance,
    transform: [
      {
        translateY: entrance.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View style={styles.root}>
        <ImageBackground
          source={require("../../../../assets/welcome/paper-background.png")}
          resizeMode="cover"
          style={styles.background}
        >
          <LinearGradient
            colors={["rgba(255,250,243,0.25)", "rgba(246,227,197,0.28)", "rgba(190,174,166,0.07)"]}
            style={styles.background}
          >
            <View style={[styles.safeArea, { paddingTop: topInset, paddingBottom: bottomInset }]}>
              <View style={styles.topBar}>
                <View>
                  <Text style={styles.topKicker}>Daily check-in</Text>
                  <Text style={styles.stepLabel}>
                    {isComplete ? "Complete" : `${String(questionIndex + 1).padStart(2, "0")} / ${String(totalQuestions).padStart(2, "0")}`}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close daily check-in"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  {supportsLiquidGlass ? (
                    <GlassView glassEffectStyle="regular" isInteractive style={styles.closeSurface}>
                      <X color="#725A54" size={19} strokeWidth={2} />
                    </GlassView>
                  ) : (
                    <View style={[styles.closeSurface, styles.closeFallback]}>
                      <X color="#725A54" size={19} strokeWidth={2} />
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={styles.progressRow}>
                {Array.from({ length: totalQuestions }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressSegment,
                      (isComplete || index <= questionIndex) && styles.progressSegmentActive,
                    ]}
                  />
                ))}
              </View>

              {isComplete ? (
                <Animated.View style={[styles.completionContent, animatedStyle]}>
                  <View style={styles.completionMark}>
                    <View style={styles.completionMarkInner}>
                      <Check color="#725A54" size={31} strokeWidth={2.3} />
                    </View>
                    <Sparkles color="#8B746D" size={25} strokeWidth={1.7} style={styles.completionSparkle} />
                  </View>
                  <Text style={styles.completionKicker}>A moment for yourself</Text>
                  <Text style={styles.completionTitle}>Daily check-in complete</Text>
                  <Text style={styles.completionBody}>
                    Your answers are saved. We’re personalizing the practices that may support you best today.
                  </Text>
                  <View style={styles.completionDots}>
                    {Array.from({ length: totalQuestions }).map((_, index) => (
                      <View key={index} style={styles.completionDot} />
                    ))}
                  </View>
                  <Pressable accessibilityRole="button" onPress={onFinish} style={styles.finishButton}>
                    <Text style={styles.finishButtonText}>See my recommendations</Text>
                    <ChevronRight color="#725A54" size={20} strokeWidth={2.2} />
                  </Pressable>
                </Animated.View>
              ) : (
                <Animated.View style={[styles.questionPage, animatedStyle]}>
                  <ScrollView
                    bounces={false}
                    contentContainerStyle={styles.questionScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.questionCopy}>
                      <Text style={styles.questionNumber}>Question {questionIndex + 1}</Text>
                      <Text style={styles.questionText}>{question.question}</Text>
                      <Text style={styles.questionHint}>{questionHints[question.id]}</Text>
                    </View>

                    <QuestionOptions
                      onSelect={onSelect}
                      question={question}
                      selectedAnswer={selectedAnswer}
                    />
                  </ScrollView>

                  <View style={styles.bottomBar}>
                    <Pressable accessibilityLabel="Previous question" onPress={onBack} style={styles.backButton}>
                      <ChevronLeft color="#725A54" size={20} strokeWidth={2.1} />
                    </Pressable>
                    <View style={styles.bottomCopy}>
                      <Text style={styles.selectedCaption}>{selectedAnswer ? "Selected" : "Choose one to continue"}</Text>
                      <Text numberOfLines={1} style={styles.selectedValue}>{selectedAnswer || "Not answered"}</Text>
                    </View>
                    <Pressable
                      accessibilityLabel={questionIndex === totalQuestions - 1 ? "Save check-in" : "Next question"}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !selectedAnswer || isSaving }}
                      disabled={!selectedAnswer || isSaving}
                      onPress={onNext}
                      style={[styles.nextButton, (!selectedAnswer || isSaving) && styles.nextButtonDisabled]}
                    >
                      {isSaving ? (
                        <ActivityIndicator color="#725A54" size="small" />
                      ) : (
                        <ChevronRight color="#725A54" size={21} strokeWidth={2.2} />
                      )}
                    </Pressable>
                  </View>
                  {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
                </Animated.View>
              )}
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6E3C5" },
  background: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 4,
  },
  topKicker: {
    color: "rgba(95,59,43,0.5)",
    fontFamily: sansFont,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  stepLabel: {
    marginTop: 4,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "700",
  },
  closeButton: { width: 42, height: 42, borderRadius: 21 },
  closeSurface: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 21,
  },
  closeFallback: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
    backgroundColor: "rgba(255,255,255,0.52)",
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(95,59,43,0.1)",
  },
  progressSegmentActive: { backgroundColor: "#96817A" },
  questionPage: { flex: 1 },
  questionScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
  },
  questionCopy: { alignItems: "center", marginBottom: 36 },
  questionNumber: {
    color: "#8B746D",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  questionText: {
    maxWidth: 350,
    marginTop: 12,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 28,
    lineHeight: 35,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  questionHint: {
    maxWidth: 310,
    marginTop: 12,
    color: "rgba(95,59,43,0.54)",
    fontFamily: sansFont,
    fontSize: typeScale.control,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },
  moodRow: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  moodOption: { flex: 1, alignItems: "center" },
  moodCircle: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  moodCircleSelected: {
    borderWidth: 1.5,
    borderColor: "rgba(111,87,81,0.55)",
    backgroundColor: "rgba(255,255,255,0.72)",
    shadowColor: "#6F5751",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  moodLabel: {
    marginTop: 9,
    color: "rgba(95,59,43,0.52)",
    fontFamily: sansFont,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  moodLabelSelected: { color: "#673F3F", fontWeight: "800" },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  answerCard: {
    width: "48%",
    minHeight: 112,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.68)",
    backgroundColor: "rgba(255,255,255,0.44)",
    padding: 14,
  },
  answerCardSelected: {
    borderColor: "rgba(111,87,81,0.46)",
    backgroundColor: "rgba(255,255,255,0.66)",
  },
  answerIcon: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    backgroundColor: "rgba(246,227,197,0.62)",
  },
  answerIconSelected: {
    borderWidth: 1,
    borderColor: "rgba(111,87,81,0.2)",
    backgroundColor: "rgba(246,227,197,0.5)",
  },
  answerLabel: {
    marginTop: 10,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  answerLabelSelected: { color: "#673F3F", fontWeight: "800" },
  selectedCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(111,87,81,0.18)",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  scaleControl: {
    minHeight: 160,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 24,
    paddingHorizontal: 4,
  },
  scaleTrack: {
    position: "absolute",
    top: 49,
    left: 42,
    right: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(95,59,43,0.12)",
  },
  scaleOption: { flex: 1, alignItems: "center", zIndex: 1 },
  scaleNode: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "rgba(95,59,43,0.13)",
    backgroundColor: "#F8ECDA",
  },
  scaleNodePassed: {
    borderColor: "rgba(111,87,81,0.24)",
    backgroundColor: "rgba(255,255,255,0.52)",
  },
  scaleNodeSelected: {
    borderColor: "rgba(111,87,81,0.62)",
    backgroundColor: "rgba(255,255,255,0.78)",
    transform: [{ scale: 1.04 }],
  },
  scaleLabel: {
    marginTop: 12,
    color: "rgba(95,59,43,0.5)",
    fontFamily: sansFont,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  scaleLabelSelected: { color: "#673F3F", fontWeight: "800" },
  bottomBar: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  backButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.48)",
  },
  bottomCopy: { minWidth: 0, flex: 1 },
  selectedCaption: {
    color: "rgba(95,59,43,0.46)",
    fontFamily: sansFont,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  selectedValue: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 14,
    fontWeight: "700",
  },
  nextButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(111,87,81,0.22)",
    backgroundColor: "rgba(255,255,255,0.68)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  nextButtonDisabled: { opacity: 0.28 },
  saveError: {
    paddingHorizontal: 24,
    paddingBottom: 4,
    color: "#874853",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  completionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 30,
  },
  completionMark: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 59,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
  },
  completionMarkInner: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "rgba(111,87,81,0.22)",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  completionSparkle: { position: "absolute", top: 4, right: 3 },
  completionKicker: {
    marginTop: 30,
    color: "#8B746D",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  completionTitle: {
    marginTop: 10,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "700",
    textAlign: "center",
  },
  completionBody: {
    maxWidth: 330,
    marginTop: 14,
    color: "rgba(95,59,43,0.58)",
    fontFamily: sansFont,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
  },
  completionDots: { flexDirection: "row", gap: 8, marginTop: 24 },
  completionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#96817A" },
  finishButton: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    alignSelf: "stretch",
    marginTop: 34,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(111,87,81,0.22)",
    backgroundColor: "rgba(255,255,255,0.68)",
  },
  finishButtonText: {
    color: "#725A54",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "800",
  },
});
