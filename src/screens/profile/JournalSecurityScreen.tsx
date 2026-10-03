import React from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { JournalPrivacyPanel } from "../../components/journal/JournalPrivacyGate";

export default function JournalSecurityScreen({ navigation }: { navigation: { goBack: () => void } }) {
  return <View style={styles.root}>
    <ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to profile" onPress={navigation.goBack} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back to profile</Text>
          </Pressable>
          <Text style={styles.kicker}>SETTINGS</Text>
          <Text style={styles.title}>Journal privacy</Text>
          <Text style={styles.intro}>Manage your journal lock and recovery key here.</Text>
          <JournalPrivacyPanel />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6E3C5" },
  background: { flex: 1 }, safeArea: { flex: 1 },
  content: { flexGrow: 1, padding: 24, paddingBottom: 48 },
  backButton: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 28 },
  backText: { color: "#673F3F", fontSize: 16, fontWeight: "600" },
  kicker: { color: "#8B5863", fontSize: 12, fontWeight: "800", letterSpacing: 1.4 },
  title: { color: "#5F3B2B", fontSize: 36, fontWeight: "600", marginTop: 8 },
  intro: { color: "#795E55", fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
});
