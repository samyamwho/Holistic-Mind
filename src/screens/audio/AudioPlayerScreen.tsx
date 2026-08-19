import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  ImageBackground,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ChevronDown, Headphones, Pause, Play, RotateCcw, RotateCw } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAudioPlayerController } from "../../context/AudioPlayerContext";

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const reelHoles = [
  { top: 7, left: 29 }, { top: 16, left: 49 }, { top: 38, left: 49 },
  { top: 49, left: 29 }, { top: 38, left: 8 }, { top: 16, left: 8 },
];

function CassetteReel({ rotation }: { rotation: Animated.AnimatedInterpolation<string> }) {
  return <View style={styles.reelOuter}>
    <Animated.View style={[styles.reel, { transform: [{ rotate: rotation }] }]}>
      {reelHoles.map((position, index) => <View key={index} style={[styles.reelHole, position]} />)}
      <View style={styles.reelHub}><View style={styles.reelHubCenter} /></View>
    </Animated.View>
  </View>;
}

export default function AudioPlayerScreen({ navigation }: { navigation: { goBack: () => void } }) {
  const { track, playing, loading, currentTime, duration, toggle, seekTo, skipBy } = useAudioPlayerController();
  const [progressWidth, setProgressWidth] = useState(1);
  const reelProgress = useRef(new Animated.Value(0)).current;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    reelProgress.stopAnimation();
    if (!playing) return;
    reelProgress.setValue(0);
    const animation = Animated.loop(Animated.timing(reelProgress, {
      toValue: 1,
      duration: 1_700,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [playing, reelProgress]);

  const rotation = reelProgress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const lightOpacity = playing
    ? reelProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.35, 1, 0.35] })
    : 0.25;

  const seekFromPress = (event: { nativeEvent: { locationX: number } }) => {
    if (duration > 0) seekTo((event.nativeEvent.locationX / progressWidth) * duration);
  };
  const measureProgress = (event: LayoutChangeEvent) => setProgressWidth(event.nativeEvent.layout.width || 1);

  return <View style={styles.root}>
    <ImageBackground source={require("../../../assets/welcome/paper-background.png")} resizeMode="cover" style={styles.background}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close player" onPress={navigation.goBack} style={styles.headerButton}><ChevronDown color="#5F3B2B" size={27} /></Pressable>
          <View><Text style={styles.headerKicker}>Holistic Mind</Text><Text style={styles.headerTitle}>Cassette player</Text></View>
          <View style={styles.headerButton} />
        </View>

        {track ? <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.cassetteShadow}>
            <View style={styles.cassette}>
              <View style={[styles.screw, styles.screwTopLeft]}><View style={styles.screwLine} /></View>
              <View style={[styles.screw, styles.screwTopRight]}><View style={styles.screwLine} /></View>
              <View style={[styles.screw, styles.screwBottomLeft]}><View style={styles.screwLine} /></View>
              <View style={[styles.screw, styles.screwBottomRight]}><View style={styles.screwLine} /></View>

              <View style={styles.cassetteLabel}>
                <View style={styles.labelHeader}>
                  <View style={styles.labelCopy}><Text numberOfLines={1} style={styles.labelBrand}>HOLISTIC MIND</Text><Text numberOfLines={1} style={styles.labelTitle}>{track.title}</Text></View>
                  {track.imageUrl ? <Image source={{ uri: track.imageUrl }} style={styles.coverThumbnail} /> : <View style={styles.coverFallback}><Headphones color="#FFF6E9" size={18} /></View>}
                </View>
                <View style={styles.tapeWindow}>
                  <CassetteReel rotation={rotation} />
                  <View style={styles.tapeBridge}><View style={styles.tapeStrip} /><Text style={styles.sideMark}>A</Text></View>
                  <CassetteReel rotation={rotation} />
                </View>
                <View style={styles.labelRules}><View style={styles.labelRule} /><View style={styles.labelRule} /><View style={styles.labelRule} /></View>
              </View>

              <View style={styles.transportRow}>
                <Animated.View style={[styles.transportLight, { opacity: lightOpacity }]} />
                <Text style={styles.transportText}>{loading ? "BUFFERING" : playing ? "PLAYING" : "PAUSED"}</Text>
                <Text style={styles.tapeType}>TYPE I · NORMAL</Text>
              </View>
              <View style={styles.cassetteBase}><View style={styles.baseHole} /><View style={styles.baseWindow} /><View style={styles.baseHole} /></View>
            </View>
          </View>

          <View style={styles.trackCopy}>
            <Text numberOfLines={2} style={styles.title}>{track.title}</Text>
            <Text style={styles.artist}>Holistic Mind · {track.category}</Text>
          </View>

          <Pressable accessibilityLabel="Seek audio" accessibilityRole="adjustable" onLayout={measureProgress} onPress={seekFromPress} style={styles.progressTouch}>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /><View style={[styles.progressThumb, { left: `${progress * 100}%` }]} /></View>
          </Pressable>
          <View style={styles.times}><Text style={styles.time}>{formatTime(currentTime)}</Text><Text style={styles.time}>-{formatTime(Math.max(0, duration - currentTime))}</Text></View>

          <View style={styles.controls}>
            <Pressable accessibilityLabel="Go back 15 seconds" onPress={() => skipBy(-15)} style={styles.secondaryControl}><RotateCcw color="#5F3B2B" size={30} /><Text style={styles.skipText}>15</Text></Pressable>
            <Pressable accessibilityLabel={playing ? "Pause" : "Play"} onPress={toggle} style={styles.playButton}>{loading ? <ActivityIndicator color="#FFF8EE" /> : playing ? <Pause color="#FFF8EE" fill="#FFF8EE" size={34} /> : <Play color="#FFF8EE" fill="#FFF8EE" size={34} />}</Pressable>
            <Pressable accessibilityLabel="Go forward 15 seconds" onPress={() => skipBy(15)} style={styles.secondaryControl}><RotateCw color="#5F3B2B" size={30} /><Text style={styles.skipText}>15</Text></Pressable>
          </View>
          <Text style={styles.supportText}>The reels move with your practice. Pause, breathe, and continue when you are ready.</Text>
        </ScrollView> : <View style={styles.empty}><Headphones color="rgba(95,59,43,.45)" size={52} /><Text style={styles.emptyText}>Choose an audio recording from Explore.</Text></View>}
      </SafeAreaView>
    </ImageBackground>
  </View>;
}

const serif = Platform.select({ ios: "Times New Roman", android: "serif", default: "serif" });
const mono = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6E3C5" },
  background: { flex: 1 },
  safe: { flex: 1 },
  header: { height: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 19 },
  headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerKicker: { color: "rgba(95,59,43,.53)", fontSize: 9, fontWeight: "800", letterSpacing: 1.5, textAlign: "center" },
  headerTitle: { color: "#5F3B2B", fontSize: 14, fontWeight: "700", textAlign: "center", marginTop: 3 },
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  cassetteShadow: { width: "100%", maxWidth: 390, alignSelf: "center", borderRadius: 26, shadowColor: "#38251D", shadowOpacity: 0.27, shadowRadius: 22, shadowOffset: { width: 0, height: 15 } },
  cassette: { width: "100%", aspectRatio: 1.42, padding: 24, borderWidth: 2, borderColor: "#4E332B", borderRadius: 24, backgroundColor: "#765047", overflow: "hidden" },
  cassetteLabel: { flex: 1, padding: 12, borderRadius: 13, backgroundColor: "#F5D9B6", borderWidth: 1.5, borderColor: "#4E332B" },
  labelHeader: { minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 8 },
  labelCopy: { minWidth: 0, flex: 1 },
  labelBrand: { color: "#765047", fontFamily: mono, fontSize: 8, fontWeight: "900", letterSpacing: 2 },
  labelTitle: { marginTop: 4, color: "#4B312B", fontFamily: mono, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  coverThumbnail: { width: 34, height: 34, borderRadius: 5 },
  coverFallback: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: "#765047" },
  tapeWindow: { height: 88, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, borderWidth: 2, borderColor: "#4A302B", borderRadius: 44, backgroundColor: "#2A2320" },
  reelOuter: { width: 70, height: 70, alignItems: "center", justifyContent: "center", borderRadius: 35, backgroundColor: "#EFE4D4", borderWidth: 2, borderColor: "#BDA78F" },
  reel: { width: 66, height: 66, borderRadius: 33 },
  reelHole: { position: "absolute", width: 10, height: 10, borderRadius: 5, backgroundColor: "#765047" },
  reelHub: { position: "absolute", left: 21, top: 21, width: 24, height: 24, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 2, borderColor: "#765047", backgroundColor: "#D9C5AA" },
  reelHubCenter: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#765047" },
  tapeBridge: { width: 42, alignItems: "center", gap: 8 },
  tapeStrip: { width: 46, height: 11, borderRadius: 6, backgroundColor: "#8C553A", borderWidth: 1, borderColor: "#D7A878" },
  sideMark: { color: "#F6DDBF", fontFamily: mono, fontSize: 18, fontWeight: "900" },
  labelRules: { height: 19, justifyContent: "space-evenly" },
  labelRule: { height: 1, backgroundColor: "rgba(118,80,71,.26)" },
  transportRow: { height: 28, flexDirection: "row", alignItems: "center", paddingHorizontal: 9 },
  transportLight: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#F0B26B" },
  transportText: { marginLeft: 7, color: "#F8E8D1", fontFamily: mono, fontSize: 8, fontWeight: "800", letterSpacing: 1 },
  tapeType: { marginLeft: "auto", color: "rgba(255,241,218,.65)", fontFamily: mono, fontSize: 7, fontWeight: "700" },
  cassetteBase: { height: 37, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22, borderTopLeftRadius: 19, borderTopRightRadius: 19, backgroundColor: "#5D3F39" },
  baseHole: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2A2320" },
  baseWindow: { width: 56, height: 12, borderRadius: 6, backgroundColor: "#2A2320" },
  screw: { position: "absolute", zIndex: 2, width: 11, height: 11, alignItems: "center", justifyContent: "center", borderRadius: 6, backgroundColor: "#D7B58E", borderWidth: 1, borderColor: "#4E332B" },
  screwLine: { width: 7, height: 1, backgroundColor: "#4E332B", transform: [{ rotate: "45deg" }] },
  screwTopLeft: { top: 9, left: 10 }, screwTopRight: { top: 9, right: 10 }, screwBottomLeft: { bottom: 9, left: 10 }, screwBottomRight: { bottom: 9, right: 10 },
  trackCopy: { width: "100%", maxWidth: 390, alignSelf: "center", marginTop: 28 },
  title: { color: "#5F3B2B", fontFamily: serif, fontSize: 29, lineHeight: 34, fontWeight: "600" },
  artist: { marginTop: 6, color: "rgba(95,59,43,.58)", fontSize: 13, fontWeight: "600" },
  progressTouch: { width: "100%", maxWidth: 390, height: 25, alignSelf: "center", justifyContent: "center", marginTop: 17 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "rgba(95,59,43,.18)" },
  progressFill: { position: "absolute", left: 0, height: 4, borderRadius: 2, backgroundColor: "#673F3F" },
  progressThumb: { position: "absolute", top: -5, width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: "#673F3F" },
  times: { width: "100%", maxWidth: 390, alignSelf: "center", flexDirection: "row", justifyContent: "space-between" },
  time: { color: "rgba(95,59,43,.52)", fontSize: 11, fontWeight: "700" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 38, marginTop: 16 },
  secondaryControl: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  skipText: { position: "absolute", color: "#5F3B2B", fontSize: 8, fontWeight: "900" },
  playButton: { width: 72, height: 72, alignItems: "center", justifyContent: "center", borderRadius: 36, backgroundColor: "#673F3F", shadowColor: "#3F302A", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 7 } },
  supportText: { maxWidth: 310, alignSelf: "center", marginTop: 22, color: "rgba(95,59,43,.52)", fontSize: 11, lineHeight: 17, textAlign: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { color: "rgba(95,59,43,.58)", fontSize: 15 },
});
