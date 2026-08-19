import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

export type AudioTrack = {
  id: string;
  title: string;
  category: string;
  audioUrl: string;
  imageUrl?: string | null;
  durationSeconds?: number | null;
};

type AudioPlayerContextValue = {
  track: AudioTrack | null;
  playing: boolean;
  loading: boolean;
  currentTime: number;
  duration: number;
  playTrack: (track: AudioTrack) => Promise<void>;
  toggle: () => void;
  seekTo: (seconds: number) => Promise<void>;
  skipBy: (seconds: number) => Promise<void>;
  close: () => void;
};

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500, downloadFirst: false });
  const status = useAudioPlayerStatus(player);
  const [track, setTrack] = useState<AudioTrack | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => undefined);
  }, []);

  const playTrack = useCallback(async (nextTrack: AudioTrack) => {
    if (track?.id !== nextTrack.id) {
      player.replace({ uri: nextTrack.audioUrl });
      setTrack(nextTrack);
    } else if (status.didJustFinish) {
      await player.seekTo(0);
    }
    player.setActiveForLockScreen(true, {
      title: nextTrack.title,
      artist: "Holistic Mind",
      albumTitle: nextTrack.category,
      artworkUrl: nextTrack.imageUrl ?? undefined,
    });
    player.play();
  }, [player, status.didJustFinish, track?.id]);

  const toggle = useCallback(async () => {
    if (!track) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.didJustFinish) await player.seekTo(0);
    player.play();
  }, [player, status.didJustFinish, status.playing, track]);

  const seekTo = useCallback(async (seconds: number) => {
    await player.seekTo(Math.max(0, Math.min(seconds, status.duration || seconds)));
  }, [player, status.duration]);

  const skipBy = useCallback((seconds: number) => seekTo(status.currentTime + seconds), [seekTo, status.currentTime]);

  const close = useCallback(() => {
    player.pause();
    player.setActiveForLockScreen(false);
    player.seekTo(0).catch(() => undefined);
    setTrack(null);
  }, [player]);

  const value = useMemo(() => ({
    track, playing: status.playing, loading: Boolean(track) && (!status.isLoaded || status.isBuffering),
    currentTime: status.currentTime || 0,
    duration: status.duration || track?.durationSeconds || 0,
    playTrack, toggle, seekTo, skipBy, close,
  }), [close, playTrack, seekTo, skipBy, status.currentTime, status.duration, status.isBuffering, status.isLoaded, status.playing, toggle, track]);

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}

export function useAudioPlayerController() {
  const value = useContext(AudioPlayerContext);
  if (!value) throw new Error("useAudioPlayerController must be used inside AudioPlayerProvider");
  return value;
}
