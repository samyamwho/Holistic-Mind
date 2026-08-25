import React, { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { getGoogleIdToken } from "../../services/auth/googleAuth";

type SignupScreenProps = {
  navigation: {
    navigate: (screen: string) => void;
    replace: (screen: string, params?: Record<string, string>) => void;
  };
};

export default function SignupScreen({ navigation }: SignupScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();

  const completeSignup = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      setErrorMessage("Enter your name, email, and a password of at least 8 characters.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);
    try {
      const result = await signUp(name, email, password);
      navigation.replace("VerifyEmail", result.emailDeliveryWarning
        ? { emailDeliveryWarning: result.emailDeliveryWarning }
        : undefined);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Account creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeGoogleSignup = async () => {
    setErrorMessage(""); setIsSubmitting(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) return;
      const result = await signInWithGoogle(idToken);
      navigation.replace(result.isNewUser ? "Onboarding" : "MainTabs");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in could not be completed.");
    } finally { setIsSubmitting(false); }
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
            <View style={styles.header}>
              <Text style={styles.kicker}>Holistic Mind</Text>
              <LineArt />
              <Text style={styles.title}>Create your space</Text>
              <Text style={styles.subtitle}>
                Begin with simple daily support for calm, focus, and grounding.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>Full name</Text>
                <TextInput
                  autoComplete="name"
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor="rgba(95, 59, 43, 0.4)"
                  style={styles.input}
                  value={name}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Email address</Text>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="Enter your email address"
                  placeholderTextColor="rgba(95, 59, 43, 0.4)"
                  style={styles.input}
                  value={email}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordInputWrap}>
                  <TextInput
                    autoComplete="new-password"
                    onChangeText={setPassword}
                    onSubmitEditing={completeSignup}
                    placeholder="Create a password"
                    placeholderTextColor="rgba(95, 59, 43, 0.4)"
                    returnKeyType="go"
                    secureTextEntry={!showPassword}
                    style={styles.passwordInput}
                    value={password}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    onPress={() => setShowPassword((current) => !current)}
                    style={styles.iconButton}
                  >
                    <EyeIcon hidden={!showPassword} />
                  </Pressable>
                </View>
              </View>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={completeSignup}
                style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#F6E3C5" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create account</Text>
                )}
              </Pressable>

              <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.dividerText}>OR</Text><View style={styles.divider} /></View>
              <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={completeGoogleSignup} style={styles.googleButton}>
                <Text style={styles.googleLetter}>G</Text><Text style={styles.googleButtonText}>Continue with Google</Text>
              </Pressable>
            </View>

            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={styles.switchLink} onPress={() => navigation.navigate("Login")}>
                Login
              </Text>
            </Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

function LineArt() {
  return (
    <View style={styles.lineArt}>
      <View style={styles.lineArcLeft} />
      <View style={styles.lineArcRight} />
      <View style={styles.lineDot} />
      <View style={styles.lineBase} />
    </View>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <View style={styles.eyeIcon}>
      <View style={styles.eyeShape} />
      <View style={styles.eyeDot} />
      {hidden ? <View style={styles.eyeSlash} /> : null}
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
    paddingTop: 30,
    paddingBottom: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 28,
  },
  kicker: {
    color: "#673F3F",
    fontFamily: interFont,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  lineArt: {
    width: 84,
    height: 76,
    marginTop: 26,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  lineArcLeft: {
    position: "absolute",
    left: 16,
    width: 32,
    height: 50,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.34)",
    borderTopLeftRadius: 28,
    transform: [{ rotate: "-12deg" }],
  },
  lineArcRight: {
    position: "absolute",
    right: 16,
    width: 32,
    height: 50,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(95, 59, 43, 0.34)",
    borderTopRightRadius: 28,
    transform: [{ rotate: "12deg" }],
  },
  lineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DFA2B1",
  },
  lineBase: {
    position: "absolute",
    bottom: 12,
    width: 48,
    height: 1,
    backgroundColor: "rgba(95, 59, 43, 0.34)",
  },
  title: {
    color: "#5F3B2B",
    fontFamily: serifFont,
    fontSize: 46,
    fontStyle: "italic",
    fontWeight: "400",
    lineHeight: 52,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 12,
    maxWidth: 310,
    color: "rgba(103, 63, 63, 0.72)",
    fontFamily: interFont,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 8,
  },
  label: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 13,
    fontWeight: "500",
  },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.64)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
    paddingHorizontal: 20,
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 15,
    fontWeight: "500",
  },
  passwordInputWrap: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.64)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.86)",
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingLeft: 20,
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 15,
    fontWeight: "500",
  },
  iconButton: {
    width: 52,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  eyeIcon: {
    width: 25,
    height: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  eyeShape: {
    width: 21,
    height: 14,
    borderRadius: 11,
    borderWidth: 1.6,
    borderColor: "rgba(95, 59, 43, 0.68)",
    transform: [{ scaleY: 0.72 }, { rotate: "45deg" }],
  },
  eyeDot: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(95, 59, 43, 0.68)",
  },
  eyeSlash: {
    position: "absolute",
    width: 25,
    height: 1.8,
    borderRadius: 999,
    backgroundColor: "rgba(95, 59, 43, 0.72)",
    transform: [{ rotate: "-32deg" }],
  },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    width: "95%",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(95, 59, 43, 0.74)",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#F6E3C5",
    fontFamily: interFont,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButtonDisabled: {
    opacity: 0.68,
  },
  errorText: {
    marginTop: -3,
    color: "#874853",
    fontFamily: interFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(95, 59, 43, 0.12)",
  },
  dividerText: {
    color: "rgba(95, 59, 43, 0.5)",
    fontFamily: interFont,
    fontSize: 11,
    fontWeight: "500",
  },
  googleButton: {
    height: 58,
    borderRadius: 16,
    width: "95%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.74)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  googleLetter: {
    color: "#5F3B2B",
    fontFamily: Platform.select({
      ios: "Arial",
      android: "sans-serif",
      web: "Arial, sans-serif",
      default: "sans-serif",
    }),
    fontSize: 16,
    fontWeight: "700",
  },
  googleButtonText: {
    color: "#5F3B2B",
    fontFamily: interFont,
    fontSize: 15,
    fontWeight: "500",
  },
  switchText: {
    marginTop: "auto",
    color: "rgba(95, 59, 43, 0.68)",
    fontFamily: interFont,
    fontSize: 13,
    textAlign: "center",
  },
  switchLink: {
    color: "#673F3F",
    fontWeight: "600",
  },
});
