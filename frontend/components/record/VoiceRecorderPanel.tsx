import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Linking, StyleSheet } from "react-native";
import {
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { useTimer } from "@/hooks/gen/timer/useTimer";
import Button from "../ui/buttons/Button";
import { useSendVoiceMessage } from "@/hooks/api/chat/useSendVoiceMessage";
import { useSelector } from "react-redux";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { IChatProps } from "@/services/chat/Chat.service";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<boolean>(false);
  const token = useSelector((state: IInitialState) => state.token);
  const [file, setFile] = useState<string>("");

  const { mutateAsync: send_message, isPending: isPendingSendMessage } =
    useSendVoiceMessage();

  const { showAlert } = useAlert();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(file || "");

  // Используем кастомный хук useTimer
  const { time, startTimer, pauseTimer, resetTimer, totalMilliseconds } =
    useTimer();

  const requestMicrophonePermission = useCallback(async () => {
    const status = await getRecordingPermissionsAsync();
    setPermissionStatus(status.granted);
  }, []);

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  const formatCustomTime = (totalMilliseconds: number): string => {
    // Можно использовать time из хука, но если хочешь, оставь форматирование тут.
    // Форматирование уже есть в useTimer, так что можно просто вернуть time.
    return time;
  };

  const onStartRecord = async () => {
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
        setFile("");
        player?.release();
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

  const onStopRecord = useCallback(async () => {
    await audioRecorder.stop();
    pauseTimer(); // Останавливаем таймер (ставим на паузу) после остановки записи
    // Если нужно сбрасывать таймер после остановки записи, можно вызвать resetTimer()

    await new Promise((r) => setTimeout(r, 500));
    const recordedUri = audioRecorder.uri;
    if (recordedUri) {
      const fileInfo = await FileSystem.getInfoAsync(recordedUri);
      if (fileInfo.exists) {
        await new Promise((r) => setTimeout(r, 200));
        setFile(fileInfo.uri);
      } else {
        console.warn("Файл не существует:", recordedUri);
      }
    }

    setIsRecording(false);
  }, [audioRecorder, pauseTimer]);

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

  const onDeleteFile = async () => {
    if (file) {
      try {
        player?.remove();
        await FileSystem.deleteAsync(file);
        await new Promise((r) => setTimeout(r, 500));
        setFile("");
        resetTimer(); // Сбрасываем таймер при удалении файла
      } catch (e) {
        console.warn("Ошибка при удалении файла", e);
      }
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!file) {
      showAlert({
        title: "Ошибка",
        subtitle: "Нет файла для отправки",
      });
      return;
    }

    try {
      const fileInfo = await FileSystem.getInfoAsync(file);
      if (!fileInfo.exists) {
        showAlert({ title: "Ошибка", subtitle: "Файл не найден." });
        return;
      }

      const props: IChatProps = {
        fileUri: fileInfo.uri,
        fileName: "recording.m4a",
        mimeType: "audio/mp4",
      };
      await send_message(props); // 👈 твоя функция отправки
    } catch (error) {
      console.error("Ошибка при отправке аудио:", error);
      showAlert({
        title: "Ошибка отправки",
        subtitle: "Не удалось отправить аудиофайл.",
      });
    }
  }, [file, send_message]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Аудиозапись</Text>

      {file && player ? (
        <View style={styles.audioFileContainer}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.split("/").pop()}
          </Text>

          <Text style={styles.time}>
            Длительность: {formatCustomTime(totalMilliseconds)}
          </Text>

          <View style={styles.buttonsRow}>
            <Button
              title="▶️ Воспроизвести"
              type="text"
              onPress={async () => {
                if (player) {
                  await player.seekTo(0); // перемотать на начало
                  player.play(); // запустить воспроизведение
                }
              }}
              textStyle={{ color: "#0a7ea4" }}
            />
            <Button
              type="text"
              textStyle={{ color: "#0a7ea4" }}
              title="⏸ Пауза"
              onPress={() => player?.pause()}
            />
            <Button
              title="Удалить"
              type="text"
              onPress={onDeleteFile}
              textStyle={{ color: "red" }}
            />
            <Button
              onPress={handleSendMessage}
              isLoading={isPendingSendMessage}
            >
              Отправить
            </Button>
          </View>
        </View>
      ) : (
        <Button
          title={isRecording ? "Идёт запись..." : "Начать запись"}
          onPress={onStartRecord}
          disabled={isRecording}
        />
      )}

      {isRecording && (
        <>
          <Text style={styles.time}>Время записи: {time}</Text>
          <Button title="Остановить запись" onPress={onStopRecord} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  audioFileContainer: {
    width: "100%",
    display: "flex",
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  fileName: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  time: { fontSize: 14, color: "#333", marginBottom: 10 },
  buttonsRow: {
    flexDirection: "column",
    gap: 15,
    marginBottom: 10,
  },
});
