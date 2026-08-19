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
  const result = await GoogleSignin.signIn();
  if (result.type !== "success") return null;
  if (!result.data.idToken) throw new Error("Google did not return an identity token.");
  return result.data.idToken;
}
