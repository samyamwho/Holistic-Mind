import React from "react";
import "./global.css";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { AudioPlayerProvider } from "./src/context/AudioPlayerContext";

export default function App() {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <AppNavigator />
      </AudioPlayerProvider>
    </AuthProvider>
  );
}
