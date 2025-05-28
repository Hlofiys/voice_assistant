import { useState, useEffect, useCallback } from "react";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!text) return;

    setIsSpeaking(true);
    Speech.speak(text, {
      voice:
        Platform.OS === "android"
          ? "ru-ru-x-ruf-local"
          : "com.apple.voice.compact.ru-RU.Milena",
      language: "ru-RU",
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return {
    isSpeaking,
    speak,
    stop,
  };
}
