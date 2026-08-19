import React, { useMemo, useRef } from "react";
import { Animated, Image, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { Music2, Pause, Play } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import { useAudioPlayerController } from "../../context/AudioPlayerContext";

type CompactAudioPlayerProps = {
  onOpen: () => void;
  placement?: "inline" | "expanded" | "none";
  nativeGlass?: boolean;
};

export default function CompactAudioPlayer({ onOpen, placement = "expanded", nativeGlass = false }: CompactAudioPlayerProps) {
  const audioPlayer = useAudioPlayerController();
  const track = audioPlayer.track;
  const closePlayer = audioPlayer.close;
  const translateY = useRef(new Animated.Value(0)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 28 || gesture.vy > 0.8) {
        Animated.timing(translateY, { toValue: 90, duration: 160, useNativeDriver: true }).start(() => {
          translateY.setValue(0);
          closePlayer();
        });
        return;
      }
      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }).start();
    },
    onPanResponderTerminate: () => Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }).start(),
  }), [closePlayer, translateY]);

  if (!track) return null;

  const compact = placement === "inline";
  const progress = audioPlayer.duration > 0
    ? Math.min(100, (audioPlayer.currentTime / audioPlayer.duration) * 100)
    : 0;
  const ringSize = compact ? 32 : 36;
  const ringRadius = (ringSize - 4) / 2;
  const circumference = 2 * Math.PI * ringRadius;

  return (
    <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateY }] }}>
      <Pressable accessibilityLabel={`Open player for ${track.title}`} onPress={onOpen} style={[styles.player, nativeGlass ? styles.playerNative : styles.playerFallback, compact && styles.playerCompact]}>
        <View style={[styles.artwork, compact && styles.artworkCompact]}>
          {track.imageUrl ? <Image source={{ uri: track.imageUrl }} style={styles.image} /> : <Music2 color="#75464D" size={compact ? 17 : 19} strokeWidth={2.2} />}
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
        </View>
        <Pressable
          accessibilityLabel={audioPlayer.playing ? "Pause audio" : "Play audio"}
          hitSlop={8}
          onPress={(event) => { event.stopPropagation(); audioPlayer.toggle(); }}
          style={[styles.control, compact && styles.controlCompact]}
        >
          <Svg height={ringSize} pointerEvents="none" style={styles.progressRing} viewBox={`0 0 ${ringSize} ${ringSize}`} width={ringSize}>
            <Circle cx={ringSize / 2} cy={ringSize / 2} fill="none" r={ringRadius} stroke="rgba(255,248,238,.2)" strokeWidth={2} />
            <Circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              fill="none"
              r={ringRadius}
              rotation={-90}
              origin={`${ringSize / 2}, ${ringSize / 2}`}
              stroke="#FFF8EE"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={circumference * (1 - progress / 100)}
              strokeLinecap="round"
              strokeWidth={2}
            />
          </Svg>
          {audioPlayer.playing ? <Pause color="#FFF8EE" fill="#FFF8EE" size={compact ? 15 : 17} /> : <Play color="#FFF8EE" fill="#FFF8EE" size={compact ? 15 : 17} />}
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  player: {
    height: 44,
    marginHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    paddingHorizontal: 6,
    borderRadius: 16,
  },
  playerNative: { backgroundColor: "transparent" },
  playerFallback: { borderWidth: 1, borderColor: "rgba(255,255,255,.74)", backgroundColor: "rgba(255,249,240,.94)" },
  playerCompact: { height: 38, marginHorizontal: 5, borderRadius: 14 },
  artwork: { width: 32, height: 32, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 999, backgroundColor: "rgba(223,162,177,.3)" },
  artworkCompact: { width: 28, height: 28, borderRadius: 999 },
  image: { width: "100%", height: "100%" },
  copy: { minWidth: 0, flex: 1 },
  title: { color: "#5F3B2B", fontSize: 13, fontWeight: "700" },
  control: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: "#673F3F" },
  controlCompact: { width: 32, height: 32, borderRadius: 16 },
  progressRing: { position: "absolute" },
});
