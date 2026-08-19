import React, { useState } from "react";
import { ActivityIndicator, ImageBackground, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { forgotPassword, resetPassword } from "../../services/auth/authApi";

type Nav = { navigate: (screen: string, params?: Record<string, string>) => void; replace: (screen: string) => void; goBack: () => void };

function Shell({ title, subtitle, children, navigation }: { title: string; subtitle: string; children: React.ReactNode; navigation: Nav }) {
  return <View style={styles.root}><ImageBackground source={require("../../../assets/welcome/paper-background.png")} style={styles.background} resizeMode="cover">
    <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={navigation.goBack} accessibilityRole="button"><Text style={styles.back}>‹ Back</Text></Pressable>
      <Text style={styles.kicker}>Holistic Mind</Text><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.form}>{children}</View>
    </ScrollView></SafeAreaView>
  </ImageBackground></View>;
}

const Field = ({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) => <View style={styles.field}>
  <Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="rgba(95,59,43,.4)" style={styles.input} />
</View>;

const Submit = ({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) => <Pressable disabled={busy} onPress={onPress} style={[styles.button, busy && styles.disabled]}>
  {busy ? <ActivityIndicator color="#F6E3C5" /> : <Text style={styles.buttonText}>{label}</Text>}
</Pressable>;

export function ForgotPasswordScreen({ navigation }: { navigation: Nav }) {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async () => { if (!email.trim()) return setError("Enter your email address."); setBusy(true); setError(""); try { await forgotPassword(email.trim()); navigation.navigate("ResetPassword", { email: email.trim() }); } catch (e) { setError(e instanceof Error ? e.message : "Could not request a reset code."); } finally { setBusy(false); } };
  return <Shell navigation={navigation} title="Reset your password" subtitle="We’ll send a six-digit code if an account exists for this email.">
    <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="Enter your email address" />
    {error ? <Text style={styles.error}>{error}</Text> : null}<Submit label="Send reset code" busy={busy} onPress={submit} />
  </Shell>;
}

export function ResetPasswordScreen({ navigation, route }: { navigation: Nav; route: { params?: { email?: string } } }) {
  const [email, setEmail] = useState(route.params?.email ?? ""); const [code, setCode] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async () => { if (!email.trim() || !/^\d{6}$/.test(code) || password.length < 8) return setError("Enter your email, six-digit code, and a password of at least 8 characters."); setBusy(true); setError(""); try { await resetPassword(email.trim(), code, password); navigation.replace("Login"); } catch (e) { setError(e instanceof Error ? e.message : "Password reset failed."); } finally { setBusy(false); } };
  return <Shell navigation={navigation} title="Choose a new password" subtitle="Enter the code from your email. It expires after 15 minutes.">
    <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
    <Field label="Six-digit code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" placeholder="000000" />
    <Field label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" placeholder="At least 8 characters" />
    {error ? <Text style={styles.error}>{error}</Text> : null}<Submit label="Reset password" busy={busy} onPress={submit} />
  </Shell>;
}

export function VerifyEmailScreen({ navigation }: { navigation: Nav }) {
  const { user, verifyEmail, resendVerification, signOut } = useAuth(); const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const submit = async () => { if (!/^\d{6}$/.test(code)) return setMessage("Enter the six-digit code."); setBusy(true); setMessage(""); try { await verifyEmail(code); navigation.replace("Onboarding"); } catch (e) { setMessage(e instanceof Error ? e.message : "Verification failed."); } finally { setBusy(false); } };
  const resend = async () => { setBusy(true); setMessage(""); try { await resendVerification(); setMessage("A new code has been sent."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not resend the code."); } finally { setBusy(false); } };
  return <Shell navigation={{...navigation, goBack: async () => { await signOut(); navigation.replace("Login"); }}} title="Verify your email" subtitle={`Enter the code sent to ${user?.email ?? "your email"}.`}>
    <Field label="Six-digit code" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" textContentType="oneTimeCode" placeholder="000000" />
    {message ? <Text style={styles.message}>{message}</Text> : null}<Submit label="Verify email" busy={busy} onPress={submit} />
    <Pressable disabled={busy} onPress={resend}><Text style={styles.link}>Send a new code</Text></Pressable>
  </Shell>;
}

const serif = Platform.select({ ios: "Times New Roman", android: "serif", default: "serif" });
const styles = StyleSheet.create({ root:{flex:1,backgroundColor:"#F6E3C5"},background:{flex:1},safe:{flex:1},content:{flexGrow:1,padding:28,paddingTop:20},back:{color:"#673F3F",fontSize:17,marginBottom:45},kicker:{color:"#673F3F",fontSize:13,fontWeight:"600",letterSpacing:1.4,textAlign:"center",textTransform:"uppercase"},title:{color:"#5F3B2B",fontFamily:serif,fontSize:42,fontStyle:"italic",lineHeight:48,textAlign:"center",marginTop:24},subtitle:{color:"rgba(103,63,63,.72)",fontSize:15,lineHeight:22,textAlign:"center",marginTop:12},form:{marginTop:40,gap:18},field:{gap:8},label:{color:"#5F3B2B",fontSize:14,fontWeight:"600"},input:{height:54,borderWidth:1,borderColor:"rgba(103,63,63,.22)",borderRadius:16,paddingHorizontal:16,color:"#5F3B2B",backgroundColor:"rgba(255,255,255,.35)",fontSize:16},button:{height:54,borderRadius:27,alignItems:"center",justifyContent:"center",backgroundColor:"#673F3F",marginTop:5},disabled:{opacity:.55},buttonText:{color:"#F6E3C5",fontSize:16,fontWeight:"700"},error:{color:"#A23B3B",fontSize:14},message:{color:"#673F3F",fontSize:14,textAlign:"center"},link:{color:"#673F3F",fontSize:15,fontWeight:"700",textAlign:"center",padding:12} });
