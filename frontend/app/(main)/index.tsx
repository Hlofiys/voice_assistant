import { useCallback, useEffect, useMemo } from "react";
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
import { useLogout } from "@/hooks/api/auth/useLogout";
import * as SecureStorage from "expo-secure-store";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { SecureStorageKeys } from "@/constants/SecureStorage";

export default function HomeScreen() {
  const router = useRouter();
  const token = useSelector((state: IInitialState) => state.token);
  const { showAlert } = useAlert();
  const { mutateAsync: logout, isPending: isPendingLogout } = useLogout();

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  const fetchConfirmDataAndAlert = useCallback(async () => {
    try {
      const rawData = await SecureStorage.getItemAsync(
        SecureStorageKeys.CONFIRM_DATA
      );
      const confirmData: { email: string; code: string } | null = rawData
        ? JSON.parse(rawData)
        : null;

      if (confirmData && confirmData.code && confirmData.email) {
        showAlert({
          title: `Вы не прошли регистрацию до конца`,
          subtitle: "Перейти к завершению регистрации",
          buttons: [
            {
              text: "Да",
              onPress: () => {
                router.push("/(identity)/confirm");
              },
            },
          ],
        });
      }
    } catch (e) {
      console.warn("Ошибка при чтении confirmData:", e);
    }
  }, [router, showAlert]);

  useEffect(() => {
    fetchConfirmDataAndAlert();
  }, []);

  const buttonProps = useMemo<ButtonProps>(() => {
    if (token) {
      return {
        title: "Начать",
        onPress: () => router.push("/(main)/record"),
      };
    }

    return {
      title: "Войти",
      onPress: () => router.push("/auth"),
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

      <ControlPanel gap={token ? 10 : undefined}>
        <Button type="primary" disabled={isPendingLogout} {...buttonProps} />

        {token ? (
          <Button
            onPress={handleLogout}
            type="text"
            isLoading={isPendingLogout}
            loadingIndicatorColor="rgba(255, 0, 0, .7)"
          >
            <Text style={{ color: "rgba(255, 0, 0, .7)" }}>
              Выйти из аккаунта
            </Text>
          </Button>
        ) : (
          <ThemedText>
            Нет учетной записи?{" "}
            <ThemedText type="link" onPress={() => router.push("/register")}>
              Зарегистрируйтесь
            </ThemedText>
          </ThemedText>
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
    color: "#AAA",
    textAlign: "center",
  },
});
