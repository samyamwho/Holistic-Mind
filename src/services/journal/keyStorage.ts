import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { parseRecoveryCode, recoveryCode, type JournalKey } from "./journalCrypto";

const storageKey = (userId: string) => `holistic-mind.journal.v1.${userId}`;
// Web keys live only in the mounted JournalProvider. Never localStorage or cookies.
export async function loadDeviceJournalKey(userId: string): Promise<JournalKey | null> {
  if (Platform.OS === "web") return null;
  const value = await SecureStore.getItemAsync(storageKey(userId));
  if (!value) return null;
  try { return parseRecoveryCode(value); }
  catch { return null; } // A damaged local copy can still be restored with the recovery key.
}
export async function saveDeviceJournalKey(userId: string, key: JournalKey) {
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(storageKey(userId), recoveryCode(key), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}
export async function deleteDeviceJournalKey(userId: string) {
  if (Platform.OS !== "web") await SecureStore.deleteItemAsync(storageKey(userId));
}
