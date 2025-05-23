import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/gen/theme/useColorScheme";
import store from "@/reduxToolkit/Store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertProvider } from "@/context/providers/portal.modal/AlertProvider";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const client = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  });

  if (!loaded) {
    return null;
  }

  return (
    <AlertProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <QueryClientProvider client={client}>
          <Provider store={store}>
            <Stack
              screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: "horizontal",
              }}
            />
            <StatusBar />
          </Provider>
        </QueryClientProvider>
      </ThemeProvider>
    </AlertProvider>
  );
}
