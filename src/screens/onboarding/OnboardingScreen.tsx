import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { saveOnboardingResponses } from "../../services/wellness/wellnessApi";

type OnboardingScreenProps = {
  navigation: {
    replace: (screen: string) => void;
  };
};

type OptionStep = {
  kind: "options";
  title: string;
  subtitle: string;
  key: string;
  options: string[];
  descriptions?: Record<string, string>;
  note?: string;
};

type InfoStep = {
  kind: "intro" | "info" | "summary";
  title: string;
  subtitle?: string;
};

type Step = OptionStep | InfoStep;

const steps: Step[] = [
  {
    kind: "intro",
    title: "Holistic Mind",
    subtitle: "Your quiet space for check-ins, breathwork, and grounding.",
  },
  {
    kind: "options",
    key: "support",
    title: "What feels most important to care for now?",
    subtitle: "This helps us understand your pace and context.",
    options: [
      "Improve mood",
      "Reduce stress & anxiety",
      "Improve sleep",
      "Feel more focused",
      "Something else",
    ],
    descriptions: {
      "Improve mood": "More than 20 gentle exercises available for mood support.",
      "Reduce stress & anxiety": "Breathing, grounding, and short resets for tense moments.",
      "Improve sleep": "Evening wind-down tools to help your body settle.",
      "Feel more focused": "Tiny practices for clarity when your mind feels scattered.",
      "Something else": "We will keep the experience flexible and open for you.",
    },
    note: "Your selections won't limit access to any features.",
  },
  {
    kind: "options",
    key: "age",
    title: "How old are you?",
    subtitle: "This helps us shape language and pacing.",
    options: ["16-24", "25-34", "35-44", "45-54", "55+"],
    descriptions: {
      "16-24": "Early routines, gentle check-ins, and low-pressure support.",
      "25-34": "Tools for busy days, stress, focus, and emotional balance.",
      "35-44": "Support for energy, family, work, and grounding rhythms.",
      "45-54": "Calm practices shaped around reflection and steady pacing.",
      "55+": "Simple, clear tools for calm, sleep, and daily care.",
    },
    note: "Your selections won't limit access to any features.",
  },
  {
    kind: "options",
    key: "dailyTime",
    title: "When would you like a gentle self-care nudge?",
    subtitle: "Choose the moment that feels easiest to keep.",
    options: ["Morning", "During the day", "Evening"],
  },
  {
    kind: "info",
    title: "You're setting up a private, safe space that grows with you.",
    subtitle: "Small daily signals help Holistic Mind recommend calmer next steps.",
  },
  {
    kind: "summary",
    title: "Support for your mood starts here.",
    subtitle: "Start with a daily check-in, try gentle practices, and go deeper with reflection.",
  },
];

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { runAuthenticated } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const step = steps[activeStep];
  const isFirstStep = activeStep === 0;
  const isLastStep = activeStep === steps.length - 1;
  const selectedAnswer = step.kind === "options" ? answers[step.key] : undefined;
  const canContinue = step.kind !== "options" || Boolean(selectedAnswer);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const goNext = async () => {
    if (!canContinue) {
      return;
    }

    if (isLastStep) {
      const support = answers.support;
      const age = answers.age;
      const dailyTime = answers.dailyTime;
      if (!support || !age || !dailyTime) {
        Alert.alert("Onboarding incomplete", "Please go back and answer each onboarding question.");
        return;
      }
      setIsSaving(true);
      try {
        await runAuthenticated((token) => saveOnboardingResponses(token, { support, age, dailyTime }));
        navigation.replace("MainTabs");
      } catch {
        Alert.alert("Unable to save", "Please check your connection and try again.");
      } finally {
        setIsSaving(false);
      }
      return;
    }

    setActiveStep((current) => current + 1);
  };

  const goBack = () => {
    if (isFirstStep) {
      return;
    }

    setActiveStep((current) => current - 1);
  };

  const skip = () => {
    navigation.replace("MainTabs");
  };

  const selectAnswer = (key: string, value: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAnswers((current) => ({
      ...current,
      [key]: value,
    }));
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
            <View style={styles.topBar}>
              <Pressable
                accessibilityRole="button"
                disabled={isFirstStep}
                onPress={goBack}
                style={[styles.topButton, isFirstStep && styles.hiddenButton]}
              >
                <Text style={styles.topButtonText}>‹</Text>
              </Pressable>
              <View style={styles.progressWrap}>
                {steps.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.progressDot,
                      index <= activeStep && styles.progressDotActive,
                    ]}
                  />
                ))}
              </View>
              <Pressable accessibilityRole="button" onPress={skip} style={styles.skipButton}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {step.kind === "intro" ? <IntroStep step={step} /> : null}
              {step.kind === "options" ? (
                <OptionStepView
                  step={step}
                  selectedAnswer={selectedAnswer}
                  onSelect={(value) => selectAnswer(step.key, value)}
                />
              ) : null}
              {step.kind === "info" ? <InfoStepView step={step} /> : null}
              {step.kind === "summary" ? <SummaryStep step={step} /> : null}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              disabled={!canContinue || isSaving}
              onPress={goNext}
              style={[styles.primaryButton, (!canContinue || isSaving) && styles.primaryButtonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? "Saving..." : isFirstStep ? "Begin" : isLastStep ? "Begin the journey" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function IntroStep({ step }: { step: InfoStep }) {
  return (
    <View style={styles.introContent}>
      <View style={styles.introImageCrop}>
        <Image
          source={require("../../../assets/onboarding/intro-line-art.png")}
          resizeMode="contain"
          style={styles.introImage}
        />
      </View>
      <Text style={styles.brandTitle}>{step.title}</Text>
      <Text style={styles.subtitle}>{step.subtitle}</Text>
    </View>
  );
}

function OptionStepView({
  step,
  selectedAnswer,
  onSelect,
}: {
  step: OptionStep;
  selectedAnswer?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.questionContent}>
      <Text style={styles.questionTitle}>{step.title}</Text>
      <Text style={styles.questionSubtitle}>{step.subtitle}</Text>
      <View style={styles.optionList}>
        {step.options.map((option) => {
          const selected = selectedAnswer === option;
          const description = step.descriptions?.[option];
          const isAgeStep = step.key === "age";
          const shouldExpand = selected && description && !isAgeStep;

          return (
            <Pressable
              accessibilityRole="button"
              key={option}
              onPress={() => onSelect(option)}
              style={[
                styles.optionCard,
                isAgeStep && styles.ageOptionCard,
                selected && styles.optionCardSelected,
              ]}
            >
              <View style={styles.optionHeader}>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option}
                </Text>
                <View style={[styles.optionIndicator, selected && styles.optionIndicatorSelected]}>
                  {selected ? <View style={styles.optionIndicatorDot} /> : null}
                </View>
              </View>
              {shouldExpand ? (
                <Text style={styles.optionDescription}>{description}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {step.note ? <Text style={styles.noteText}>{step.note}</Text> : null}
    </View>
  );
}

function InfoStepView({ step }: { step: InfoStep }) {
  return (
    <View style={styles.infoContent}>
      <Text style={styles.infoTitle}>{step.title}</Text>
      <Image
        source={require("../../../assets/onboarding/private-space.png")}
        resizeMode="contain"
        style={styles.privateSpaceImage}
      />
      <Text style={styles.subtitle}>{step.subtitle}</Text>
    </View>
  );
}

function SummaryStep({ step }: { step: InfoStep }) {
  return (
    <View style={styles.summaryContent}>
      <Text style={styles.questionTitle}>{step.title}</Text>
      <View style={styles.summaryList}>
        <SummaryItem
          image={require("../../../assets/onboarding/summary-checkin.png")}
          title="Daily check-in"
          body="Track your mood over time."
        />
        <SummaryItem
          image={require("../../../assets/onboarding/summary-practice.png")}
          title="Gentle practices"
          body="Breathwork and grounding tools for emotional balance."
        />
        <SummaryItem
          image={require("../../../assets/onboarding/summary-reflect.png")}
          title="Reflect deeper"
          body="Journal prompts for calmer self-awareness."
        />
      </View>
      <Text style={styles.noteText}>{step.subtitle}</Text>
    </View>
  );
}

function SummaryItem({
  image,
  title,
  body,
}: {
  image: number;
  title: string;
  body: string;
}) {
  return (
    <View style={styles.summaryItem}>
      <View style={styles.summaryIcon}>
        <Image source={image} resizeMode="contain" style={styles.summaryIconImage} />
      </View>
      <View style={styles.summaryCopy}>
        <Text style={styles.summaryTitle}>{title}</Text>
        <Text style={styles.summaryBody}>{body}</Text>
      </View>
    </View>
  );
}

function FaceLineArt() {
  return (
    <View style={styles.faceArt}>
      <View style={styles.faceCurve} />
      <View style={styles.faceNose} />
      <View style={styles.faceEye} />
      <View style={styles.faceShoulder} />
      <View style={styles.birdBody} />
      <View style={styles.birdWing} />
      <View style={styles.birdEye} />
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

const questionFont = Platform.select({
  ios: "Roboto",
  android: "Roboto",
  web: "Poppins, Roboto, Inter, system-ui, sans-serif",
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
  topBar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topButton: {
    width: 42,
    height: 42,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  hiddenButton: {
    opacity: 0,
  },
  topButtonText: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 34,
    fontWeight: "300",
  },
  progressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  progressDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(95, 59, 43, 0.18)",
  },
  progressDotActive: {
    width: 18,
    backgroundColor: "#DFA2B1",
  },
  skipButton: {
    minWidth: 42,
    height: 42,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  skipText: {
    color: "rgba(95, 59, 43, 0.62)",
    fontFamily: interFont,
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 22,
  },
  introContent: {
    alignItems: "center",
  },
  introImageCrop: {
    width: 270,
    height: 330,
    marginTop: 10,
    overflow: "hidden",
  },
  introImage: {
    width: 270,
    height: 430,
    transform: [{ translateY: -62 }],
  },
  brandTitle: {
    marginTop: 10,
    color: "#5F3B2B",
    fontFamily: serifFont,
    fontSize: 50,
    fontStyle: "italic",
    fontWeight: "400",
    lineHeight: 56,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 14,
    maxWidth: 310,
    color: "rgba(103, 63, 63, 0.72)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  questionContent: {
    alignItems: "center",
  },
  questionTitle: {
    color: "#5F3B2B",
    fontFamily: questionFont,
    fontSize: 27,
    fontWeight: "600",
    lineHeight: 34,
    maxWidth: 340,
    textAlign: "center",
  },
  questionSubtitle: {
    marginTop: 12,
    maxWidth: 320,
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  optionList: {
    width: "100%",
    gap: 10,
    marginTop: 34,
  },
  optionCard: {
    minHeight: 58,
    borderRadius: 18,
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    borderWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.07)",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  ageOptionCard: {
    minHeight: 54,
    borderRadius: 16,
    paddingVertical: 13,
  },
  optionCardSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderColor: "rgba(95, 59, 43, 0.14)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  optionText: {
    color: "#5F3B2B",
    flex: 1,
    fontFamily: questionFont,
    fontSize: 16,
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#673F3F",
    fontWeight: "600",
  },
  optionIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.08)",
  },
  optionIndicatorSelected: {
    backgroundColor: "rgba(95, 59, 43, 0.16)",
  },
  optionIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#5F3B2B",
  },
  optionDescription: {
    marginTop: 10,
    paddingRight: 32,
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: interFont,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
  },
  noteText: {
    marginTop: 32,
    maxWidth: 310,
    color: "rgba(95, 59, 43, 0.56)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  infoContent: {
    alignItems: "center",
  },
  infoTitle: {
    color: "#5F3B2B",
    fontFamily: questionFont,
    fontSize: 27,
    fontWeight: "600",
    lineHeight: 36,
    maxWidth: 340,
    textAlign: "center",
  },
  privateSpaceImage: {
    width: 320,
    height: 250,
    marginTop: 58,
    marginBottom: 8,
  },
  summaryContent: {
    alignItems: "center",
  },
  summaryList: {
    width: "100%",
    marginTop: 42,
    gap: 18,
  },
  summaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  summaryIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.46)",
    overflow: "hidden",
  },
  summaryIconImage: {
    width: 64,
    height: 64,
  },
  summaryCopy: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(95, 59, 43, 0.12)",
    paddingBottom: 16,
  },
  summaryTitle: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 18,
    fontWeight: "600",
  },
  summaryBody: {
    marginTop: 5,
    color: "rgba(95, 59, 43, 0.58)",
    fontFamily: interFont,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    height: 58,
    borderRadius: 18,
    width: "95%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.78)",
  },
  primaryButtonDisabled: {
    opacity: 0.42,
  },
  primaryButtonText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 16,
    fontWeight: "600",
  },
  faceArt: {
    width: 230,
    height: 260,
    marginTop: 44,
  },
  faceCurve: {
    position: "absolute",
    top: 6,
    left: 72,
    width: 86,
    height: 166,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "rgba(95, 59, 43, 0.6)",
    borderTopRightRadius: 84,
    transform: [{ rotate: "-13deg" }],
  },
  faceNose: {
    position: "absolute",
    top: 94,
    left: 72,
    width: 50,
    height: 66,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: "rgba(95, 59, 43, 0.6)",
    borderBottomLeftRadius: 28,
    transform: [{ rotate: "8deg" }],
  },
  faceEye: {
    position: "absolute",
    top: 92,
    left: 111,
    width: 40,
    height: 20,
    borderBottomWidth: 3,
    borderColor: "rgba(95, 59, 43, 0.6)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  faceShoulder: {
    position: "absolute",
    bottom: 8,
    left: 30,
    width: 126,
    height: 64,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "rgba(95, 59, 43, 0.6)",
    borderTopLeftRadius: 90,
    transform: [{ rotate: "-16deg" }],
  },
  birdBody: {
    position: "absolute",
    top: 148,
    left: 92,
    width: 76,
    height: 48,
    borderRadius: 38,
    backgroundColor: "#DFA2B1",
  },
  birdWing: {
    position: "absolute",
    top: 164,
    left: 124,
    width: 30,
    height: 16,
    borderBottomWidth: 2,
    borderColor: "#5F3B2B",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  birdEye: {
    position: "absolute",
    top: 160,
    left: 112,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#5F3B2B",
  },
  privateArt: {
    width: 290,
    height: 260,
    marginTop: 72,
    marginBottom: 26,
  },
  notebook: {
    position: "absolute",
    left: 34,
    top: 44,
    width: 92,
    height: 118,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    transform: [{ rotate: "-10deg" }],
  },
  notebookLineOne: {
    position: "absolute",
    left: 58,
    top: 82,
    width: 44,
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(95, 59, 43, 0.44)",
    transform: [{ rotate: "-10deg" }],
  },
  notebookLineTwo: {
    position: "absolute",
    left: 58,
    top: 102,
    width: 54,
    height: 2,
    borderRadius: 999,
    backgroundColor: "rgba(95, 59, 43, 0.44)",
    transform: [{ rotate: "-10deg" }],
  },
  cup: {
    position: "absolute",
    left: 106,
    bottom: 26,
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: "rgba(223, 162, 177, 0.34)",
    borderWidth: 14,
    borderColor: "rgba(95, 59, 43, 0.58)",
  },
  phone: {
    position: "absolute",
    right: 22,
    top: 70,
    width: 76,
    height: 126,
    borderRadius: 18,
    backgroundColor: "rgba(95, 59, 43, 0.72)",
    transform: [{ rotate: "18deg" }],
  },
  phoneBird: {
    position: "absolute",
    right: 42,
    top: 118,
    width: 34,
    height: 22,
    borderRadius: 17,
    backgroundColor: "#F6E3C5",
    transform: [{ rotate: "18deg" }],
  },
});
