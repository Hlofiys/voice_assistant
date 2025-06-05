import { useState, useCallback } from "react";
import * as FileSystem from "expo-file-system";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import { useTimer } from "@/hooks/gen/timer/useTimer";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { Linking } from "react-native";

export const useRecordingHandler = () => {
  const [file, setFile] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(file || "");
  const { time, startTimer, pauseTimer, resetTimer, totalMilliseconds } =
    useTimer();

  const { showAlert } = useAlert();

  const openSettings = () => {
    showAlert({
      title: "Нет доступа к микрофону",
      subtitle: "Разрешите доступ к микрофону в настройках устройства.",
      buttons: [
        { text: "Отмена", style: "cancel" },
        { text: "Настройки", onPress: () => Linking.openSettings() },
      ],
    });
  };

  const startRecording = async () => {
    const { status, granted } = await requestRecordingPermissionsAsync();

    if (!granted) {
      if (status === "denied") {
        openSettings();
      } else {
        showAlert({
          title: "Ошибка",
          subtitle: "Невозможно получить доступ к микрофону",
        });
      }
      return;
    }

    if (file) {
      try {
        await FileSystem.deleteAsync(file);
        player?.release();
        setFile("");
      } catch (e) {
        console.warn("Не удалось удалить старый файл", e);
      }
    }

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      startTimer(); // Запускаем таймер из хука
    } catch (error) {
      console.error("Ошибка при начале записи:", error);
    }
  };

  const stopRecording = useCallback(async () => {
    await audioRecorder.stop();
    pauseTimer(); // Останавливаем таймер (ставим на паузу) после остановки записи
    // Если нужно сбрасывать таймер после остановки записи, можно вызвать resetTimer()

    await new Promise((r) => setTimeout(r, 1500));
    const recordedUri = audioRecorder.uri;
    if (recordedUri) {
      const fileInfo = await FileSystem.getInfoAsync(recordedUri);
      if (fileInfo.exists) {
        await new Promise((r) => setTimeout(r, 500));
        setFile(fileInfo.uri);
      } else {
        console.warn("Файл не существует:", recordedUri);
      }
    }

    setIsRecording(false);
  }, [audioRecorder, pauseTimer, FileSystem]);

  const deleteFile = async () => {
    if (file) {
      await player?.remove();
      await FileSystem.deleteAsync(file);
      setFile("");
      resetTimer();
    }
  };

  const resetRecording = useCallback(async () => {
    try {
      if (isRecording) {
        await audioRecorder.stop();
        setIsRecording(false);
      }

      pauseTimer(); // Если запись не шла — просто пауза
      resetTimer(); // Обязательно сброс

      await deleteFile(); // Используем уже существующую функцию

      // player?.release(); // Если есть необходимость (возможно, уже вызывается в deleteFile)
    } catch (error) {
      console.error("Ошибка при сбросе записи:", error);
    }
  }, [isRecording, audioRecorder, pauseTimer, resetTimer, deleteFile, player]);

  return {
    isRecording,
    file,
    time,
    totalMilliseconds,
    player,
    startRecording,
    stopRecording,
    resetRecording,
    deleteFile,
  };
};
