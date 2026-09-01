import React from "react";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";

import { useAuth } from "../context/AuthContext";
import { ChangePasswordScreen, DeleteAccountScreen, ForgotPasswordScreen, LoginScreen, ResetPasswordScreen, SignupScreen, VerifyEmailScreen } from "../screens/auth";
import { ExploreScreen } from "../screens/explore";
import { ExerciseScreen } from "../screens/exercise";
import { HomeScreen } from "../screens/home";
import { FreeJournalEntryScreen, JournalScreen } from "../screens/journal";
import { HistoryScreen } from "../screens/history";
import { CourseScreen, LibraryModuleScreen, LibraryScreen, PdfViewerScreen } from "../screens/library";
import { OnboardingScreen } from "../screens/onboarding";
import { ProfileScreen } from "../screens/profile";
import { WelcomeScreen, WelcomeV2Screen } from "../screens/welcome";
import { AudioPlayerScreen } from "../screens/audio";
import CompactAudioPlayer from "../components/audio/CompactAudioPlayer";
import { useAudioPlayerController } from "../context/AudioPlayerContext";

const Tab = createNativeBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
    const navigation = useNavigation<any>();
    const audioPlayer = useAudioPlayerController();
    const usesNativeAccessory = Platform.OS === "ios" && Number.parseFloat(String(Platform.Version)) >= 26;

    return (
      <View style={styles.tabsRoot}>
        <Tab.Navigator
            hapticFeedbackEnabled
            labeled
            minimizeBehavior="onScrollDown"
            scrollEdgeAppearance="default"
            tabLabelStyle={{
                fontFamily: Platform.OS === "ios" ? "Helvetica Neue" : "sans-serif",
                fontSize: 10,
                fontWeight: "600",
            }}
            tabBarActiveTintColor="#673F3F"
            tabBarInactiveTintColor="rgba(95, 59, 43, 0.58)"
            renderBottomAccessoryView={audioPlayer.track ? ({ placement }) => (
                <CompactAudioPlayer nativeGlass onOpen={() => navigation.navigate("AudioPlayer")} placement={placement} />
            ) : undefined}
            screenOptions={{
                sceneStyle: {
                    backgroundColor: "transparent",
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: () => ({ sfSymbol: "house" }),
                    tabBarLabel: "Home",
                }}
            />
            <Tab.Screen
                name="Explore"
                component={ExploreScreen}
                options={{
                    tabBarIcon: () => ({ sfSymbol: "safari" }),
                    tabBarLabel: "Explore",
                }}
            />
            <Tab.Screen
                name="Journal"
                component={JournalScreen}
                options={{
                    tabBarIcon: () => ({ sfSymbol: "book.closed" }),
                    tabBarLabel: "Journal",
                }}
            />
            <Tab.Screen
                name="Library"
                component={LibraryScreen}
                options={{
                    tabBarIcon: () => ({ sfSymbol: "books.vertical" }),
                    tabBarLabel: "Library",
                }}
            />
        </Tab.Navigator>
        {!usesNativeAccessory && audioPlayer.track ? (
            <View pointerEvents="box-none" style={styles.fallbackPlayer}>
                <CompactAudioPlayer onOpen={() => navigation.navigate("AudioPlayer")} />
            </View>
        ) : null}
      </View>
    );
}

export default function AppNavigator() {
    const { isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <View style={styles.loadingScreen}>
                <ActivityIndicator color="#673F3F" size="small" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName={user ? (user.emailVerified ? "MainTabs" : "VerifyEmail") : "WelcomeV2"}
                screenOptions={{ headerShown: false }}
            >
                <Stack.Screen name="WelcomeV2" component={WelcomeV2Screen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
                <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
                <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="MainTabs" component={Tabs} />
                <Stack.Screen
                    name="Profile"
                    component={ProfileScreen}
                    options={{
                        animation: "slide_from_bottom",
                        gestureEnabled: true,
                        presentation: "fullScreenModal",
                    }}
                />
                <Stack.Screen name="Exercise" component={ExerciseScreen} />
                <Stack.Screen name="AudioPlayer" component={AudioPlayerScreen} />
                <Stack.Screen name="Course" component={CourseScreen} />
                <Stack.Screen name="LibraryModule" component={LibraryModuleScreen} />
                <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen
                    name="FreeJournalEntry"
                    component={FreeJournalEntryScreen}
                    options={{
                        animation: "slide_from_bottom",
                        gestureEnabled: true,
                        presentation: "fullScreenModal",
                    }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabsRoot: {
        flex: 1,
    },
    fallbackPlayer: {
        position: "absolute",
        left: 4,
        right: 4,
        bottom: Platform.OS === "android" ? 74 : 86,
    },
    loadingScreen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F6E3C5",
    },
});
