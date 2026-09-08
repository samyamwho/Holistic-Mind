import { Platform } from "react-native";

export type AppleIdentity = {
  identityToken: string;
  fullName?: string;
};

export async function getAppleIdentity(): Promise<AppleIdentity | null> {
  if (Platform.OS !== "ios") return null;

  const AppleAuthentication = await import("expo-apple-authentication");
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new Error("Sign in with Apple is not available on this device.");
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error("Apple did not return an identity token.");
    }

    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return { identityToken: credential.identityToken, fullName: fullName || undefined };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    ) {
      return null;
    }
    throw error;
  }
}
