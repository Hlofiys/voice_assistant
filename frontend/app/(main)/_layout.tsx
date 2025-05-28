import { ChatProvider } from "@/context/providers/chat/ChatProvider";
import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <ChatProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: "horizontal",
        }}
      />
    </ChatProvider>
  );
}
