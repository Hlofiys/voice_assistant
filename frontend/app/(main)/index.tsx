import { ButtonProps, StyleSheet, Text, View } from "react-native";
import LottieView from "lottie-react-native";
import Greeting from "@/assets/json/anim/greeting/Greeting.json";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import Button from "@/components/ui/buttons/Button";
import ControlPanel from "@/components/ControlPanel";
import { useDispatch, useSelector } from "react-redux";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { useCallback, useMemo } from "react";
import { useLogout } from "@/hooks/api/auth/useLogout";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken } from "@/reduxToolkit/Slices";

export default function HomeScreen() {
  const router = useRouter();
  const token = useSelector((state: IInitialState) => state.token);
  const dispatch = useDispatch();

  const { mutateAsync: logout, isPending: isPendingLogout } = useLogout();

  const handleLogout = useCallback(() => {
    logout(undefined, {
      onSuccess: async (data) => {
        await AsyncStorage.removeItem("accessToken");
        await AsyncStorage.removeItem("refreshToken");
        dispatch(setToken(null));
      },
    });
  }, [logout, setToken, dispatch]);

  const buttonProps = useMemo<ButtonProps>(() => {
    return !!token
      ? {
          title: "Начать",
          onPress: () => router.push("/(main)/record"),
        }
      : {
          title: "Войти",
          onPress: () => router.push("/auth"),
          // onPress: () => router.push("/(identity)/setpassword"),
        };
  }, [token]);

  return (
    <View style={styles.homeContainer}>
      <View style={styles.mainContent}>
        <LottieView
          style={styles.lottieAnimation}
          source={Greeting}
          loop
          autoPlay
        />
        <ThemedView style={styles.textView}>
          <ThemedText type="title">"Voice Assistant"</ThemedText>
          <ThemedText type="subtitle" style={styles.regularText}>
            Я — твой голосовой ассистент и помогу быстро найти ближайшую аптеку,
            узнать, есть ли в наличии нужные лекарства, и посмотреть их
            стоимость. Тебе нужно просто сказать, что ты ищешь.
          </ThemedText>
        </ThemedView>
      </View>
      <ControlPanel gap={(token && 10) || undefined}>
        <Button type="primary" disabled={isPendingLogout} {...buttonProps} />
        {(!token && (
          <ThemedText>
            Нет учетной записи?{" "}
            <ThemedText type="link" onPress={() => router.push("/register")}>
              Зарегистрируйтесь
            </ThemedText>
          </ThemedText>
        )) || (
          <Button
            onPress={handleLogout}
            type="text"
            isLoading={isPendingLogout}
            loadingIndicatorColor="red"
            // style={{ borderColor: 'red', borderWidth: 1 }}
          >
            <Text style={{ color: "red" }}>Выйти из аккаунта</Text>
          </Button>
        )}
      </ControlPanel>
    </View>
  );
}

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    padding: 10,
    paddingBottom: 50,
    gap: 16,
    display: "flex",
    overflow: "hidden",
  },
  mainContent: {
    flex: 1,
  },
  lottieAnimation: {
    width: "100%",
    height: 400,
    margin: 0,
  },
  textView: {
    backgroundColor: "transparent",
    paddingHorizontal: 24,
    alignItems: "center",
    paddingVertical: 16,
    gap: 15,
  },
  regularText: {
    fontSize: 15,
    color: "#444", // или используйте тему
    textAlign: "center",
  },
});
