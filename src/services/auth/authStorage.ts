import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { AuthTokens } from "./authApi";

const authSessionKey = "holistic-mind-auth-session";
let webSession: AuthTokens | null = null;

export async function saveAuthSession(tokens: AuthTokens) {
  if (Platform.OS === "web") {
    webSession = tokens;
    return;
  }

  await SecureStore.setItemAsync(authSessionKey, JSON.stringify(tokens));
}

export async function loadAuthSession() {
  const storedValue =
    Platform.OS === "web" ? (webSession ? JSON.stringify(webSession) : null) : await SecureStore.getItemAsync(authSessionKey);

  if (!storedValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<AuthTokens>;
    if (typeof parsed.accessToken !== "string" || typeof parsed.refreshToken !== "string") {
      return null;
    }

    return parsed as AuthTokens;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  if (Platform.OS === "web") {
    webSession = null;
    return;
  }

  await SecureStore.deleteItemAsync(authSessionKey);
}
