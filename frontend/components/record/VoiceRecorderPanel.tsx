// import React, { useState, useCallback, useEffect } from "react";
// import { View, Button, Text, Platform, PermissionsAndroid, Alert, Linking } from "react-native";
// import {
//   RecordingPresets,
//   useAudioPlayer,
//   useAudioRecorder,
//   requestRecordingPermissionsAsync,
//   AudioModule,
//   getRecordingPermissionsAsync,
//   AudioPlayer,
// } from "expo-audio";
// import * as FileSystem from "expo-file-system";
// import { Configuration, DefaultApi } from "@/api";

// const audio = require("../../assets/audio/sample-15s.mp3");

// export default function AudioRecorder() {
//   const [isRecording, setIsRecording] = useState<boolean>(false);
//   const [permissionStatus, setPermissionStatus] = useState<boolean>(false);
//   const [file, setFile] = useState<string>("");
//   const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

//   const player = useAudioPlayer(file);

//   const onStopRecord = useCallback(async () => {
//     await audioRecorder.stop();
//     await new Promise((r) => setTimeout(r, 500)); // Ждем 500 мс

//     const recordedUri = audioRecorder.uri;
//     console.log("Stopped. URI:", recordedUri);

//     if (!!audioRecorder.uri) {
//       const fileInfo = await FileSystem.getInfoAsync(audioRecorder.uri);
//       console.log("File info:", fileInfo.uri);
//       setFile(fileInfo.uri);
//     }
//     setIsRecording(false);
//   }, [audioRecorder]);

//   const requestMicrophonePermission = useCallback(async () => {
//     console.log("req");
//     const status = await getRecordingPermissionsAsync();
//     setPermissionStatus(status.granted);
//     console.log("get permissions granted");
//   }, [getRecordingPermissionsAsync]);

//   const openSettings = () => {
//     Alert.alert(
//       "Нет доступа к микрофону",
//       "Разрешите доступ к микрофону в настройках устройства.",
//       [
//         { text: "Отмена", style: "cancel" },
//         { text: "Открыть настройки", onPress: () => Linking.openSettings() },
//       ]
//     );
//   };
//   const onStartRecord = async () => {
//     const { status, granted } = await requestRecordingPermissionsAsync();

//     if (!granted) {
//       if (status === "denied") {
//         openSettings();
//       } else {
//         Alert.alert("Ошибка", "Невозможно получить доступ к микрофону");
//       }
//       return;
//     }

//     try {
//       await audioRecorder.prepareToRecordAsync();
//       audioRecorder.record();
//       setIsRecording(true);
//     } catch (error) {
//       console.error("Ошибка при начале записи:", error);
//     }
//   };

//   const onClick = useCallback(() => {
//     console.log(player);
//   }, [player]);

//   useEffect(() => {
//     requestMicrophonePermission();
//   }, []);

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ color: "red" }}>Запись: {player.duration}</Text>

//       {!audioRecorder.isRecording ? (
//         <Button title="Начать запись" onPress={onStartRecord} />
//       ) : (
//         <Button title="Остановить запись" onPress={onStopRecord} color="red" />
//       )}

//       <Button
//         title="Воспроизвести"
//         onPress={() => {
//           if (audioRecorder.uri) {
//             console.log("Audio URI:", audioRecorder.uri);
//             player?.play();
//           } else {
//             console.warn("Нет аудиозаписи для воспроизведения");
//           }
//         }}
//         disabled={!audioRecorder.uri}
//       />

//       <Button title="Стоп" onPress={() => player.pause()} />
//       <Button title="Релиз" onPress={() => player.release()} />
//       <Button title="длительность" onPress={onClick} />
//     </View>
//   );
// }

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Button,
  Text,
  Alert,
  Linking,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import {
  RecordingPresets,
  useAudioPlayer,
  useAudioRecorder,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [duration, setDuration] = useState<string>("00:00");
  const [permissionStatus, setPermissionStatus] = useState<boolean>(false);
  const [file, setFile] = useState<string>("");

  const { showAlert } = useAlert();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(file);

  // Таймер для обновления времени воспроизведения
  // useEffect(() => {
  //   let interval: number | null = null;

  //   if (player && file) {
  //     interval = setInterval(async () => {
  //       try {
  //         const status = await player.getStatusAsync();
  //         if (status.isLoaded) {
  //           setPlaybackStatus({
  //             positionMillis: status.positionMillis,
  //             durationMillis: status.durationMillis || 0,
  //           });
  //         }
  //       } catch (e) {
  //         // Игнорируем ошибки
  //       }
  //     }, 500);
  //   }

  //   return () => {
  //     if (interval !== null) {
  //       clearInterval(interval);
  //     }
  //   };
  // }, [player, file]);

  const requestMicrophonePermission = useCallback(async () => {
    console.log("req");
    const status = await getRecordingPermissionsAsync();
    setPermissionStatus(status.granted);
    console.log("get permissions granted");
  }, []);

  useEffect(() => {
    requestMicrophonePermission();
  }, []);

  function formatCustomTime(seconds: number): string {
    const minutes = Math.floor(seconds);
    const sec = Math.floor((seconds - minutes) * 100);

    const pad = (num: number) => num.toString().padStart(2, "0");

    return `${pad(minutes)}:${pad(sec)}`;
  }

  const onStopRecord = useCallback(async () => {
    await audioRecorder.stop();
    await new Promise((r) => setTimeout(r, 500)); // Ждем 500 мс

    const recordedUri = audioRecorder.uri;
    console.log("Stopped. URI:", recordedUri);

    if (!!recordedUri) {
      const fileInfo = await FileSystem.getInfoAsync(recordedUri);
      console.log("File info:", fileInfo);
      setFile(fileInfo.uri);
    }
    setIsRecording(false);
  }, [audioRecorder]);

  const openSettings = () => {
    showAlert({
      title: "Нет доступа к микрофону",
      subtitle: "Разрешите доступ к микрофону в настройках устройства.",
      buttons: [
        { text: "Отмена", style: "cancel" },
        { text: "Открыть настройки", onPress: () => Linking.openSettings() },
      ],
    });
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

    // Если уже есть файл - удалим его, чтобы перезаписать
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
    } catch (error) {
      console.error("Ошибка при начале записи:", error);
    }
  };

  // Удаление текущего файла
  const onDeleteFile = async () => {
    if (file) {
      try {
        // player?.release();
        player?.remove();
        await FileSystem.deleteAsync(file);
        await new Promise((r) => setTimeout(r, 500));
        setFile("");
        setDuration("00:00");
      } catch (e) {
        console.warn("Ошибка при удалении файла", e);
      }
    }
  };

  useEffect(() => {
    const formatDuration = formatCustomTime(player.duration);
    // console.log("player.duration is changed: ", formatDuration);
    // console.log(
    //   "player.duration in changed before fromated: ",
    //   player.duration
    // );
    // console.log("player dataa: ", player);
    setDuration(formatDuration);
  }, [formatCustomTime, player.duration]);

  useEffect(() => console.log("player", player), [player]);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Аудиозапись</Text>

      {file ? (
        <View style={styles.audioFileContainer}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.split("/").pop()}
          </Text>

          <Text style={styles.time}>{duration}</Text>
          <Text style={styles.time}>{player.duration}</Text>
          <View style={styles.buttonsRow}>
            <Button title="▶️ Воспроизвести" onPress={() => player?.play()} />
            <Button title="⏸ Пауза" onPress={() => player?.pause()} />
            <Button title="Удалить" onPress={onDeleteFile} color="red" />
            <Button
              title="Данные по файлу"
              onPress={() => console.log(file)}
              color="green"
            />
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
        <Button title="Остановить запись" onPress={onStopRecord} color="red" />
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
    justifyContent: "space-between",
    marginBottom: 10,
  },
});
