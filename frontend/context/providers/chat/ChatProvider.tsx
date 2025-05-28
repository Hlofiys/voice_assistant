import { createContext, useContext, useState, ReactNode } from "react";

interface Messages {
  transcription: string;
  assistant_response: string;
}

interface MessagesContextType {
  messages: Messages;
  setTranscription: (text: string) => void;
  setAssistantResponse: (text: string) => void;
}

const MessagesContext = createContext<MessagesContextType | undefined>(
  undefined
);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const [messages, setMessages] = useState<Messages>({
    transcription: "",
    assistant_response: "",
  });

  const setTranscription = (text: string) => {
    setMessages((prev) => ({ ...prev, transcription: text }));
  };

  const setAssistantResponse = (text: string) => {
    setMessages((prev) => ({ ...prev, assistant_response: text }));
  };

  return (
    <MessagesContext.Provider
      value={{ messages, setTranscription, setAssistantResponse }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

// Хук для удобного использования контекста
export const useChat = (): MessagesContextType => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
};
