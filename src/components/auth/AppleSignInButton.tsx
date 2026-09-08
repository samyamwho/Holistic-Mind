import * as AppleAuthentication from "expo-apple-authentication";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";

export default function AppleSignInButton({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) {
  if (Platform.OS !== "ios") return null;

  return (
    <View pointerEvents={disabled ? "none" : "auto"} style={[styles.wrapper, disabled && styles.disabled]}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        cornerRadius={16}
        onPress={onPress}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "95%",
    height: 58,
    alignSelf: "center",
  },
  button: {
    width: "100%",
    height: "100%",
  },
  disabled: {
    opacity: 0.68,
  },
});
