import { Platform } from "react-native";

export const appSansFont = Platform.select({
  ios: "Helvetica Neue",
  android: "sans-serif",
  web: "Helvetica Neue, Helvetica, Arial, sans-serif",
  default: "sans-serif",
});

export const typeScale = {
  screenKicker: 11,
  screenTitle: 32,
  screenTitleLine: 38,
  heroTitle: 20,
  heroTitleLine: 28,
  sectionTitle: 17,
  sectionTitleLine: 23,
  itemTitle: 15,
  itemTitleLine: 20,
  body: 14,
  bodyLine: 21,
  control: 13,
  meta: 12,
} as const;

export const screenLayout = {
  horizontalPadding: 22,
  topPadding: 14,
  headerHeight: 56,
} as const;
