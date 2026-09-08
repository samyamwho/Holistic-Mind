import { Linking } from "react-native";

function validHttpsUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export const externalLinks = {
  privacyPolicy: validHttpsUrl(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
  termsOfUse: validHttpsUrl(process.env.EXPO_PUBLIC_TERMS_OF_USE_URL),
  support: validHttpsUrl(process.env.EXPO_PUBLIC_SUPPORT_URL),
};

export async function openExternalLink(url: string) {
  if (!(await Linking.canOpenURL(url))) {
    throw new Error("This link is not available on this device.");
  }
  await Linking.openURL(url);
}
