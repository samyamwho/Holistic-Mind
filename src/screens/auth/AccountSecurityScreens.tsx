import React, { useState } from "react";
import { ActivityIndicator, Alert, ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { getGoogleIdToken } from "../../services/auth/googleAuth";

type Nav = { goBack: () => void; reset: (state: { index: number; routes: Array<{ name: string }> }) => void };

function SecurityScreen({ navigation, deletion = false }: { navigation: Nav; deletion?: boolean }) {
  const { changePassword, deleteAccount, user } = useAuth();
  const [current, setCurrent] = useState(""); const [next, setNext] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (deletion) {
      if (user?.hasPassword && !current) return setError("Enter your password to continue.");
      Alert.alert("Permanently delete account?", "Your profile, journals, check-ins, recommendations, and sessions will be deleted. This cannot be undone.", [{ text: "Cancel", style: "cancel" }, { text: "Delete account", style: "destructive", onPress: async () => { setBusy(true); setError(""); try { const confirmation = user?.hasPassword ? { password: current } : { googleIdToken: await getGoogleIdToken() }; if (!("googleIdToken" in confirmation) || confirmation.googleIdToken) { await deleteAccount(confirmation as { password: string } | { googleIdToken: string }); navigation.reset({ index: 0, routes: [{ name: "WelcomeV2" }] }); } } catch (e) { setError(e instanceof Error ? e.message : "Account deletion failed."); } finally { setBusy(false); } } }]);
      return;
    }
    if (!current || next.length < 8 || next !== confirm) return setError("Enter your current password and matching new password of at least 8 characters.");
    setBusy(true); setError(""); try { await changePassword(current, next); Alert.alert("Password updated", "Your new password is ready to use.", [{ text: "Done", onPress: navigation.goBack }]); } catch (e) { setError(e instanceof Error ? e.message : "Password could not be updated."); } finally { setBusy(false); }
  };
  return <View style={styles.root}><ImageBackground source={require("../../../assets/welcome/paper-background.png")} style={styles.background} resizeMode="cover"><SafeAreaView style={styles.safe}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.content}>
    <Pressable onPress={navigation.goBack}><Text style={styles.back}>‹ Back</Text></Pressable>
    <Text style={styles.kicker}>Account security</Text><Text style={styles.title}>{deletion ? "Delete your account" : "Change password"}</Text>
    <Text style={styles.subtitle}>{deletion ? "For your protection, confirm your password. All account data will be permanently removed." : "Choose a unique password with at least eight characters."}</Text>
    <View style={styles.form}>{!deletion || user?.hasPassword ? <><Text style={styles.label}>{deletion ? "Password" : "Current password"}</Text><TextInput value={current} onChangeText={setCurrent} secureTextEntry autoComplete="current-password" style={styles.input} /></> : <Text style={styles.googleNotice}>You’ll confirm this deletion securely with Google.</Text>}
    {!deletion ? <><Text style={styles.label}>New password</Text><TextInput value={next} onChangeText={setNext} secureTextEntry autoComplete="new-password" style={styles.input} /><Text style={styles.label}>Confirm new password</Text><TextInput value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" style={styles.input} /></> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}<Pressable disabled={busy} onPress={submit} style={[styles.button, deletion && styles.danger, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#FFF8EE" /> : <Text style={styles.buttonText}>{deletion ? "Delete account" : "Update password"}</Text>}</Pressable></View>
  </KeyboardAvoidingView></SafeAreaView></ImageBackground></View>;
}

export const ChangePasswordScreen = ({ navigation }: { navigation: Nav }) => <SecurityScreen navigation={navigation} />;
export const DeleteAccountScreen = ({ navigation }: { navigation: Nav }) => <SecurityScreen navigation={navigation} deletion />;

const serif = Platform.select({ ios:"Times New Roman", android:"serif", default:"serif" });
const styles=StyleSheet.create({root:{flex:1,backgroundColor:"#F6E3C5"},background:{flex:1},safe:{flex:1},content:{flex:1,padding:28},back:{color:"#673F3F",fontSize:17,marginBottom:50},kicker:{color:"#673F3F",fontSize:12,fontWeight:"700",letterSpacing:1.4,textTransform:"uppercase"},title:{color:"#5F3B2B",fontFamily:serif,fontSize:40,fontStyle:"italic",marginTop:12},subtitle:{color:"rgba(103,63,63,.7)",fontSize:15,lineHeight:22,marginTop:10},form:{marginTop:34,gap:10},label:{color:"#5F3B2B",fontSize:13,fontWeight:"600",marginTop:8},googleNotice:{color:"#5F3B2B",fontSize:14,textAlign:"center",padding:14},input:{height:52,borderWidth:1,borderColor:"rgba(103,63,63,.2)",borderRadius:14,paddingHorizontal:15,color:"#5F3B2B",backgroundColor:"rgba(255,255,255,.45)"},error:{color:"#A23B3B",fontSize:13,marginTop:6},button:{height:54,borderRadius:16,alignItems:"center",justifyContent:"center",backgroundColor:"#673F3F",marginTop:15},danger:{backgroundColor:"#874853"},disabled:{opacity:.6},buttonText:{color:"#FFF8EE",fontSize:15,fontWeight:"700"}});
