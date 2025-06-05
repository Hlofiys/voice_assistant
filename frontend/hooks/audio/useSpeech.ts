import { useState, useCallback, useRef } from "react";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

type Status = "playing" | "paused";

export function useSpeech() {
  const [status, setStatus] = useState<Status>("paused");
  const lastTextRef = useRef<string>("");

  const replay = useCallback((text?: string) => {
    const toSpeak = text || lastTextRef.current;
    if (!toSpeak) return;

    lastTextRef.current = toSpeak;
    setStatus("playing");

    Speech.speak(toSpeak, {
      voice:
        Platform.OS === "android"
          ? "ru-ru-x-ruf-local"
          : "com.apple.voice.compact.ru-RU.Milena",
      language: "ru-RU",
      onDone: () => setStatus("paused"),
      onStopped: () => setStatus("paused"),
      onError: () => setStatus("paused"),
    });
  }, []);

  const pause = useCallback(() => {
    Speech.stop();
    setStatus("paused");
  }, []);

  return {
    status,
    isSpeaking: status === "playing",
    replay,
    pause,
  };
}
