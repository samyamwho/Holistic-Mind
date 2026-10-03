import { Platform } from "react-native";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();

export async function getGoogleIdToken() {
  if (!webClientId) throw new Error("Google sign-in is not configured yet.");
  const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({ webClientId, iosClientId: iosClientId || undefined, offlineAccess: false });
  if (Platform.OS === "android") {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }
  let result;
  try {
    result = await GoogleSignin.signIn();
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    const detail = error instanceof Error ? error.message : "Unknown Google sign-in error";
    throw new Error(`Google sign-in failed before contacting the app server${code ? ` (${code})` : ""}: ${detail}`);
  }
  if (result.type !== "success") return null;
  if (!result.data.idToken) throw new Error("Google did not return an identity token.");
  return result.data.idToken;
}
