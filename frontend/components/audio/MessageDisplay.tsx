import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import {
  SafeAreaView,
  Text,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { MotiView } from "moti";
import { AudioPlayerControls } from "./AudioPlayerControl";
import { useChat } from "@/context/providers/chat/ChatProvider";
import { IconSymbol } from "../ui/IconSymbol";
import { useSpeech } from "@/hooks/audio/useSpeech";
import PromptSuggestions from "../PromptSuggestions";
import { FadeInView } from "../FadeInView";
import Button from "../ui/buttons/Button";
import { setSession } from "@/reduxToolkit/Slices";
import { useDispatch } from "react-redux";

export default function MessageDisplay() {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReadyToSend, setIsReadyToSend] = useState<boolean>(false);
  const [visibleWordCount, setVisibleWordCount] = useState<number>(0);

  const dispatch = useDispatch();

  const { status, replay, pause } = useSpeech();
  const { messages, setAssistantResponse, setTranscription } = useChat();

  const scrollRef = useRef<ScrollView>(null);

  const words = useMemo(() => {
    if (!messages.assistant_response) return [];

    // return messages.assistant_response
    return messages.assistant_response.split(/(\s+|\n)/g)
      .filter((token) => token.trim() !== "" || token === "\n"); // оставляем перенос
  }, [messages.assistant_response]);

  useEffect(() => {
    if (messages.assistant_response) {
      replay(messages.assistant_response);
    }
  }, [messages.assistant_response, replay]);

  // Сброс видимых слов при смене ответа ассистента
  useEffect(() => {
    setVisibleWordCount(0);
  }, [messages.assistant_response]);

  // Анимация появления слов
  useEffect(() => {
    if (visibleWordCount < words.length) {
      const timeout = setTimeout(() => {
        setVisibleWordCount((prev) => prev + 1);
      }, 80);
      return () => clearTimeout(timeout);
    }
  }, [visibleWordCount, words.length]);

  // Автоскролл при появлении новых слов
  useEffect(() => {
    if (scrollRef.current && visibleWordCount > 0) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [visibleWordCount]);

  // Используем useCallback для передачи колбэков в дочерний компонент
  const handleReadyToSendChange = useCallback(
    (ready: boolean) => setIsReadyToSend(ready),
    []
  );
  const handleRecordingStatusChange = useCallback((status: boolean) => {
    if (status === true) {
      pause();
    }
    setIsRecording(status);
  }, []);
  const handleLoadingChange = useCallback(
    (loading: boolean) => setIsLoading(loading),
    []
  );

  // Условия рендеринга упрощены для читаемости
  const showPlaceholder = useMemo(
    () => !isRecording && !isLoading && !messages.assistant_response,
    [isRecording, isLoading, messages.assistant_response]
  );
  const showReadyToSendPlaceholder = useMemo(
    () => showPlaceholder && isReadyToSend,
    [showPlaceholder, isReadyToSend]
  );
  const showStartRecordingPlaceholder = useMemo(
    () => showPlaceholder && !isReadyToSend,
    [showPlaceholder, isReadyToSend]
  );

  const newDialogHandler = useCallback(() => {
    dispatch(setSession(null));
    setIsRecording(false);
    setIsReadyToSend(false);
    setAssistantResponse(""), setTranscription("");
    pause();
    // handleRecordingStatusChange(true); //
  }, [dispatch, setSession, pause]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {(showStartRecordingPlaceholder || isRecording) && (
          <PromptSuggestions />
        )}

        {isRecording && (
          <FadeInView>
            <Text style={styles.statusText}>Запись идет...</Text>
          </FadeInView>
        )}

        {!isRecording && isLoading && (
          <FadeInView>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a7ea4" />
              <Text style={styles.statusText}>
                Загружаем ответ ассистента...
              </Text>
            </View>
          </FadeInView>
        )}

        {showReadyToSendPlaceholder && (
          <FadeInView>
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                Нажмите на главную кнопку, чтобы отправить запись
              </Text>
            </View>
          </FadeInView>
        )}

        {showStartRecordingPlaceholder && (
          <FadeInView>
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>
                Нажмите кнопку микрофона, чтобы начать запись
              </Text>
            </View>
          </FadeInView>
        )}

        {!isRecording && messages.assistant_response && (
          <>
            {!!messages.transcription && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptText}>
                  {messages.transcription}
                </Text>
              </View>
            )}

            <View style={styles.responceContainer}>
              <View style={styles.bubble}>
                <ScrollView
                  ref={scrollRef}
                  style={styles.scroll}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={[styles.word, { width: "100%" }]}>Ответ:</Text>
                  {words.slice(0, visibleWordCount).map((word, index) => {
                    if (word === "\n") {
                      return (
                        <View
                          key={`br-${index}`}
                          style={{ width: "100%", height: 10 }}
                        />
                      );
                    }

                    return (
                      <MotiView
                        key={`${word}-${index}`}
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 300 }}
                      >
                        <Text style={styles.word}>{word} </Text>
                      </MotiView>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  onPress={() => {
                    if (status === "playing") pause();
                    else replay(messages.assistant_response);
                  }}
                  style={styles.playBtn}
                >
                  <IconSymbol
                    name={status === "playing" ? "pause.circle" : "play"}
                    color="#0a7ea4"
                    size={32}
                  />
                </TouchableOpacity>
              </View>
              <Button
                onPress={newDialogHandler}
                type="text"
                textStyle={{ color: "#0a7ea4" }}
              >
                Начать новый диалог
              </Button>
            </View>
          </>
        )}
      </View>

      <AudioPlayerControls
        onReadyToSendHandler={handleReadyToSendChange}
        onRecordingStatusChange={handleRecordingStatusChange}
        onLoadingChange={handleLoadingChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  transcriptContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#2a2a2a",
    width: "100%",
  },
  transcriptText: {
    fontSize: 16,
    color: "#aaa",
    fontStyle: "italic",
  },
  responceContainer: {
    width: "100%",
    display: "flex",
    gap: 20,
  },
  bubble: {
    minWidth: "100%",
    position: "relative",
    height: 280,
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scroll: {
    flexGrow: 1,
  },
  scrollContent: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  playBtn: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  word: {
    fontSize: 18,
    color: "#eee",
    lineHeight: 28,
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  placeholderText: {
    textAlign: "center",
    fontSize: 20,
    color: "#0a7ea4",
    fontStyle: "italic",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  statusText: {
    marginTop: 10,
    fontSize: 20,
    color: "#0a7ea4",
  },
});
