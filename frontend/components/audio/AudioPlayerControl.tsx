import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { MicrophoneButton } from "../ui/buttons/microphone/MicrophoneButton";
import { AnimatePresence, MotiView } from "moti";
import { IconSymbol } from "../ui/IconSymbol";
import { useRecordingHandler } from "@/hooks/audio/useRecordingHandler";
import { TimeDisplay } from "./TimeDisplay";
import { useSendHandler } from "@/hooks/audio/useSendHandler";
import { useChat } from "@/context/providers/chat/ChatProvider";

interface IAudioPlayerControlsProps {
  onReadyToSendHandler?: (ready: boolean) => void;
  onLoadingChange?: (loading: boolean) => void;
  onRecordingStatusChange?: (isRecording: boolean) => void;
}
export const AudioPlayerControls: FC<IAudioPlayerControlsProps> = (props) => {
  const { onRecordingStatusChange, onLoadingChange, onReadyToSendHandler } =
    props;
  const [expanded, setExpanded] = useState(false);

  const { setAssistantResponse, setTranscription } = useChat();
  const {
    isRecording,
    file,
    time,
    startRecording,
    stopRecording,
    deleteFile,
    resetRecording,
  } = useRecordingHandler();

  const { handleSend, isPending } = useSendHandler(file);
  const prevIsRecording = useRef(isRecording);

  useEffect(() => {
    if (prevIsRecording.current !== isRecording && onRecordingStatusChange) {
      console.log("change recording");
      prevIsRecording.current = isRecording;
      onRecordingStatusChange(isRecording);
    }
  }, [isRecording, onRecordingStatusChange]);

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isPending);
    }
  }, [onLoadingChange, isPending]);

  const handleReset = useCallback(() => {
    onReadyToSendHandler && onReadyToSendHandler(false);
    setExpanded(false);
    resetRecording();
    deleteFile();
  }, [deleteFile, resetRecording]);

  const handleStartRecording = useCallback(async () => {
    if (!!file && !isRecording) {
      // 🔼 Отправка данных на сервер
      console.log("📤 Отправка записи...");
      await handleSend(({ data }) => {
        setAssistantResponse(data.assistant_response ?? "");
        setTranscription(data.transcription ?? "");
        console.log(data.assistant_response);
        handleReset();
        deleteFile();
      });
      return;
    }

    if (!isRecording && !!!file) {
      // ▶️ Начать запись
      onReadyToSendHandler && onReadyToSendHandler(false);
      setAssistantResponse("");
      setTranscription("");
      setExpanded(true);
      startRecording();
    } else if (isRecording && !!!file) {
      // ⏹ Остановить запись
      onReadyToSendHandler && onReadyToSendHandler(true);
      stopRecording();
    }
  }, [isRecording, file, handleReset, deleteFile]);

  const handlePause = useCallback(() => {
    onReadyToSendHandler && onReadyToSendHandler(true);
    stopRecording();
  }, []);

  return (
    <>
      <TimeDisplay time={time} visible={expanded} />
      <View style={styles.container}>
        <AnimatePresence>
          {expanded && (
            <MotiView
              from={{ opacity: 0, translateX: 0 }}
              animate={{ opacity: 1, translateX: -150 }}
              exit={{ opacity: 0, translateX: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 150 }}
              style={styles.splitButton}
            >
              <TouchableOpacity
                disabled={!!!file || isPending}
                onPress={handleReset}
              >
                <IconSymbol
                  size={35}
                  color={!!file ? "#0a7ea4" : "gray"}
                  name="repeat"
                />
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>

        <MicrophoneButton
          isLoading={isPending}
          hasRecord={!!file}
          isRecording={isRecording}
          onPress={handleStartRecording}
        />

        <AnimatePresence>
          {expanded && (
            <MotiView
              from={{ opacity: 0, translateX: 0 }}
              animate={{ opacity: 1, translateX: 150 }}
              exit={{ opacity: 0, translateX: 0 }}
              transition={{ type: "spring", damping: 15, stiffness: 150 }}
              style={styles.splitButton}
            >
              <TouchableOpacity disabled={!isRecording} onPress={handlePause}>
                <IconSymbol
                  size={35}
                  color={isRecording ? "#0a7ea4" : "gray"}
                  name="pause.circle"
                />
              </TouchableOpacity>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    padding: 10,
    marginBottom: Platform.OS === "android" ? 20 : 0,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-end",
    marginTop: "auto",
    position: "relative",
  },
  splitButton: {
    position: "absolute",
    top: "50%",
    marginTop: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});
