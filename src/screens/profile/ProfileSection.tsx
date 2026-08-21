import React, { useMemo, useState } from "react";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Bell,
  ChevronRight,
  Info,
  KeyRound,
  LogOut,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  Vibrate,
  X,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAuth,
  type ProfilePreferences,
  type UserProfile,
} from "../../context/AuthContext";
import { appSansFont as sansFont, screenLayout, typeScale } from "../../theme/typography";
import {
  reminderTimes,
  requestReminderPermission,
  scheduleTestReminder,
  synchronizeReminderNotifications,
} from "../../services/notifications/reminderNotifications";

type ProfileNavigator = {
  navigate: (screen: string) => void;
  reset: (state: { index: number; routes: Array<{ name: string }> }) => void;
};

type ProfileScreenProps = {
  navigation: ProfileNavigator & {
    getParent?: () => ProfileNavigator | undefined;
    goBack: () => void;
  };
};

type PreferenceRowProps = {
  description: string;
  enabled: boolean;
  label: string;
  onChange: (enabled: boolean) => void;
};

const fallbackProfile: UserProfile = {
  name: "Holistic Mind Member",
  email: "Personal account",
  emailVerified: false,
  hasPassword: false,
};

export default function ProfileSection({ navigation }: ProfileScreenProps) {
  const {
    preferences,
    signOut,
    updatePreference,
    updateProfile,
    user,
  } = useAuth();
  const rootNavigation = navigation.getParent?.() ?? navigation;
  const supportsLiquidGlass =
    Platform.OS === "ios" &&
    isGlassEffectAPIAvailable() &&
    isLiquidGlassAvailable();
  const profile = user ?? fallbackProfile;
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [isTestingReminder, setIsTestingReminder] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(user?.email ?? "");
  const initials = useMemo(
    () =>
      profile.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "HM",
    [profile.name]
  );

  const openEditor = () => {
    setDraftName(profile.name);
    setDraftEmail(user?.email ?? "");
    setProfileError("");
    setIsEditing(true);
  };

  const saveProfile = async () => {
    if (!draftName.trim()) {
      setProfileError("Enter your name.");
      return;
    }

    setProfileError("");
    setIsSavingProfile(true);
    try {
      await updateProfile({ name: draftName });
      setIsEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Profile could not be saved.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const restartOnboarding = () => {
    Alert.alert(
      "Review wellness preferences?",
      "You can revisit onboarding and choose new support preferences.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () =>
            rootNavigation.reset({
              index: 0,
              routes: [{ name: "Onboarding" }],
            }),
        },
      ]
    );
  };

  const showPrivacy = () => {
    Alert.alert(
      "Privacy and data",
      "Your account session is encrypted on this device. Your profile preferences are stored under your account."
    );
  };

  const showAppInfo = () => {
    Alert.alert("Holistic Mind", "Version 1.0.0\nA gentle space for daily nervous-system care.");
  };

  const confirmLogout = () => {
    Alert.alert("Log out?", "You will return to the login screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          rootNavigation.reset({
            index: 0,
            routes: [{ name: "Login" }],
          });
        },
      },
    ]);
  };

  const showNotificationSettingsAlert = () => {
    Alert.alert(
      "Notifications are turned off",
      "Allow notifications in your device settings to receive gentle reminders.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open settings", onPress: () => Linking.openSettings() },
      ]
    );
  };

  const setPreference = (key: keyof ProfilePreferences) => async (enabled: boolean) => {
    if ((key === "dailyReminder" || key === "practiceReminder") && enabled) {
      try {
        if (!(await requestReminderPermission())) {
          showNotificationSettingsAlert();
          return;
        }
      } catch (error) {
        console.warn("Unable to request notification permission", error);
        Alert.alert("Notifications unavailable", "The notification permission could not be requested.");
        return;
      }
    }

    await updatePreference(key, enabled);
  };

  const testReminder = async () => {
    if (isTestingReminder) return;
    setIsTestingReminder(true);
    try {
      const scheduled = await scheduleTestReminder();
      if (!scheduled) {
        showNotificationSettingsAlert();
        return;
      }
      await synchronizeReminderNotifications(preferences);
      Alert.alert("Test reminder scheduled", "You should receive it in a couple of seconds.");
    } catch (error) {
      console.warn("Unable to schedule test reminder", error);
      Alert.alert("Reminder unavailable", "The test reminder could not be scheduled.");
    } finally {
      setIsTestingReminder(false);
    }
  };

  return (
    <View collapsable={false} style={styles.root}>
      <ImageBackground
        {...({ collapsable: false } as any)}
        source={require("../../../assets/welcome/paper-background.png")}
        resizeMode="cover"
        style={styles.background}
      >
        <SafeAreaView collapsable={false} style={styles.safeArea} edges={["top"]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.kicker}>Your space</Text>
                <Text style={styles.title}>Profile</Text>
              </View>
              <Pressable
                accessibilityHint="Returns to the app"
                accessibilityLabel="Close profile"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => navigation.goBack()}
                style={styles.profileCloseButton}
              >
                {supportsLiquidGlass ? (
                  <GlassView
                    glassEffectStyle="regular"
                    isInteractive
                    style={styles.profileCloseSurface}
                    tintColor="rgba(255,248,238,0.16)"
                  >
                    <X color="#673F3F" size={24} strokeWidth={2.1} />
                  </GlassView>
                ) : (
                  <View style={[styles.profileCloseSurface, styles.profileCloseFallback]}>
                    <X color="#673F3F" size={24} strokeWidth={2.1} />
                  </View>
                )}
              </Pressable>
            </View>

            <View style={styles.identityPanel}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <View style={styles.identityCopy}>
                <Text numberOfLines={1} style={styles.name}>
                  {profile.name}
                </Text>
                <Text numberOfLines={1} style={styles.email}>
                  {profile.email || "Email not added"}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Edit essential profile"
                accessibilityRole="button"
                hitSlop={8}
                onPress={openEditor}
                style={styles.editButton}
              >
                <Pencil color="#673F3F" size={18} strokeWidth={2} />
              </Pressable>
            </View>

            <Text style={styles.sectionLabel}>Essential profile</Text>
            <View style={styles.sectionSurface}>
              <ActionRow
                description={profile.hasPassword ? "Update your account password" : "Create a password using your verified email"}
                icon={<KeyRound color="#70454A" size={20} strokeWidth={2} />}
                label={profile.hasPassword ? "Change password" : "Set password"}
                onPress={() => rootNavigation.navigate(profile.hasPassword ? "ChangePassword" : "ForgotPassword")}
              />
              <View style={styles.separator} />
              <ActionRow
                description="Update your display name"
                icon={<Pencil color="#70454A" size={20} strokeWidth={2} />}
                label="Personal details"
                onPress={openEditor}
              />
              <View style={styles.separator} />
              <ActionRow
                description="Goals, timing, and support focus"
                icon={<Sparkles color="#5D6850" size={20} strokeWidth={2} />}
                label="Wellness preferences"
                onPress={restartOnboarding}
              />
            </View>

            <Text style={styles.sectionLabel}>Reminders and feel</Text>
            <View style={styles.sectionSurface}>
              <PreferenceRow
                description={`Every day at ${reminderTimes.dailyCheckIn}`}
                enabled={preferences.dailyReminder}
                label="Daily check-in"
                onChange={setPreference("dailyReminder")}
              />
              <View style={styles.separator} />
              <PreferenceRow
                description={`Every day at ${reminderTimes.practice}`}
                enabled={preferences.practiceReminder}
                label="Practice reminder"
                onChange={setPreference("practiceReminder")}
              />
              <View style={styles.separator} />
              <ActionRow
                description={isTestingReminder ? "Scheduling…" : "Receive a notification in two seconds"}
                icon={isTestingReminder
                  ? <ActivityIndicator color="#78583D" size="small" />
                  : <Bell color="#78583D" size={20} strokeWidth={2} />}
                label="Test reminders"
                onPress={testReminder}
              />
              <View style={styles.separator} />
              <PreferenceRow
                description="Subtle feedback for app controls"
                enabled={preferences.haptics}
                label="Gentle haptics"
                onChange={setPreference("haptics")}
              />
            </View>

            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.sectionSurface}>
              <ActionRow
                description="How your information is handled"
                icon={<ShieldCheck color="#536458" size={21} strokeWidth={2} />}
                label="Privacy and data"
                onPress={showPrivacy}
              />
              <View style={styles.separator} />
              <ActionRow
                description="Version and app details"
                icon={<Info color="#665477" size={21} strokeWidth={2} />}
                label="About Holistic Mind"
                onPress={showAppInfo}
              />
              <View style={styles.separator} />
              <ActionRow
                description="Permanently remove your data"
                icon={<Trash2 color="#874853" size={20} strokeWidth={2} />}
                label="Delete account"
                onPress={() => rootNavigation.navigate("DeleteAccount")}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={confirmLogout}
              style={styles.logoutButton}
            >
              <LogOut color="#874853" size={20} strokeWidth={2.2} />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      <ProfileEditor
        email={draftEmail}
        errorMessage={profileError}
        isSaving={isSavingProfile}
        name={draftName}
        onChangeName={setDraftName}
        onClose={() => setIsEditing(false)}
        onSave={saveProfile}
        visible={isEditing}
      />
    </View>
  );
}

function ActionRow({
  description,
  icon,
  label,
  onPress,
}: {
  description: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionRow}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <ChevronRight color="rgba(95,59,43,0.4)" size={20} strokeWidth={2} />
    </Pressable>
  );
}

function PreferenceRow({ description, enabled, label, onChange }: PreferenceRowProps) {
  return (
    <View style={styles.preferenceRow}>
      <View style={styles.rowIcon}>
        {label === "Gentle haptics" ? (
          <Vibrate color="#78583D" size={20} strokeWidth={2} />
        ) : (
          <Bell color="#78583D" size={20} strokeWidth={2} />
        )}
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        ios_backgroundColor="rgba(95,59,43,0.16)"
        onValueChange={onChange}
        thumbColor="#FFF8EE"
        trackColor={{ false: "rgba(95,59,43,0.16)", true: "rgba(103,63,63,0.72)" }}
        value={enabled}
      />
    </View>
  );
}

function ProfileEditor({
  email,
  errorMessage,
  isSaving,
  name,
  onChangeName,
  onClose,
  onSave,
  visible,
}: {
  email: string;
  errorMessage: string;
  isSaving: boolean;
  name: string;
  onChangeName: (value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  visible: boolean;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalRoot}
      >
        <Pressable accessibilityLabel="Close profile editor" onPress={onClose} style={styles.scrim} />
        <SafeAreaView edges={["bottom"]} style={styles.editorSheet}>
          <View style={styles.editorHeader}>
            <View>
              <Text style={styles.editorKicker}>Essential profile</Text>
              <Text style={styles.editorTitle}>Personal details</Text>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <X color="#673F3F" size={21} strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Full name</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={onChangeName}
              placeholder="Your name"
              placeholderTextColor="rgba(95,59,43,0.4)"
              style={styles.input}
              value={name}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="rgba(95,59,43,0.4)"
              style={[styles.input, styles.inputDisabled]}
              value={email}
            />
          </View>

          {errorMessage ? <Text style={styles.editorError}>{errorMessage}</Text> : null}

          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={onSave}
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF8EE" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save changes</Text>
            )}
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
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
  },
  content: {
    paddingHorizontal: screenLayout.horizontalPadding,
    paddingTop: screenLayout.topPadding,
    paddingBottom: 132,
  },
  header: {
    minHeight: screenLayout.headerHeight,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 18,
    marginBottom: 20,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: "rgba(95,59,43,0.58)",
    fontFamily: sansFont,
    fontSize: typeScale.screenKicker,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 3,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: typeScale.screenTitle,
    lineHeight: typeScale.screenTitleLine,
    fontWeight: "700",
  },
  profileCloseButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  profileCloseSurface: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 26,
  },
  profileCloseFallback: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.76)",
    backgroundColor: "rgba(255,255,255,0.5)",
    shadowColor: "#5F3B2B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 4,
  },
  identityPanel: {
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.66)",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  avatar: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 31,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(223,162,177,0.42)",
  },
  avatarText: {
    color: "#673F3F",
    fontFamily: sansFont,
    fontSize: 21,
    fontWeight: "700",
  },
  identityCopy: {
    minWidth: 0,
    flex: 1,
    marginLeft: 14,
  },
  name: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 18,
    fontWeight: "700",
  },
  email: {
    marginTop: 5,
    color: "rgba(95,59,43,0.6)",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "500",
  },
  editButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.56)",
  },
  sectionLabel: {
    marginTop: 25,
    marginBottom: 9,
    color: "rgba(95,59,43,0.6)",
    fontFamily: sansFont,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sectionSurface: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.62)",
    backgroundColor: "rgba(255,255,255,0.44)",
  },
  actionRow: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  preferenceRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 19,
    backgroundColor: "rgba(246,227,197,0.66)",
  },
  rowCopy: {
    minWidth: 0,
    flex: 1,
    marginHorizontal: 12,
  },
  rowLabel: {
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "600",
  },
  rowDescription: {
    marginTop: 3,
    color: "rgba(95,59,43,0.56)",
    fontFamily: sansFont,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 64,
    backgroundColor: "rgba(95,59,43,0.12)",
  },
  logoutButton: {
    minHeight: 54,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(135,72,83,0.2)",
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  logoutText: {
    color: "#874853",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "700",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45,30,24,0.34)",
  },
  editorSheet: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#FFF8EE",
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  editorKicker: {
    color: "rgba(95,59,43,0.58)",
    fontFamily: sansFont,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  editorTitle: {
    marginTop: 4,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 24,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(95,59,43,0.07)",
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    marginBottom: 7,
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    height: 54,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(95,59,43,0.12)",
    backgroundColor: "rgba(255,255,255,0.72)",
    color: "#5F3B2B",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "500",
  },
  inputDisabled: {
    color: "rgba(95,59,43,0.52)",
    backgroundColor: "rgba(95,59,43,0.06)",
  },
  editorError: {
    marginTop: -5,
    marginBottom: 12,
    color: "#874853",
    fontFamily: sansFont,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    textAlign: "center",
  },
  saveButton: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 3,
    borderRadius: 14,
    backgroundColor: "#70494A",
  },
  saveButtonDisabled: {
    opacity: 0.68,
  },
  saveButtonText: {
    color: "#FFF8EE",
    fontFamily: sansFont,
    fontSize: 15,
    fontWeight: "700",
  },
});
