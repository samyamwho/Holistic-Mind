import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeBottomTabNavigator } from "@bottom-tabs/react-navigation";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen, SignupScreen } from "../screens/auth";
import { ExploreScreen } from "../screens/explore";
import { HomeScreen } from "../screens/home";
import { JournalScreen } from "../screens/journal";
import { OnboardingScreen } from "../screens/onboarding";
import { ProfileScreen } from "../screens/profile";
import { WelcomeScreen, WelcomeV2Screen } from "../screens/welcome";

const Tab = createNativeBottomTabNavigator();
const Stack = createNativeStackNavigator();

function Tabs() {
    return (
        <Tab.Navigator
            hapticFeedbackEnabled
            labeled
            minimizeBehavior="never"
            scrollEdgeAppearance="default"
            tabBarActiveTintColor="#673F3F"
            tabBarInactiveTintColor="rgba(95, 59, 43, 0.58)"
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
                    tabBarIcon: () => ({ sfSymbol: "book" }),
                    tabBarLabel: "Journal",
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarIcon: () => ({ sfSymbol: "person.crop.circle" }),
                    tabBarLabel: "Profile",
                }}
            />
        </Tab.Navigator>
    );
}

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="WelcomeV2" screenOptions={{ headerShown: false }}>
                <Stack.Screen name="WelcomeV2" component={WelcomeV2Screen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Signup" component={SignupScreen} />
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen name="MainTabs" component={Tabs} />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
