import { StyleSheet, View } from "react-native";
import LottieView from "lottie-react-native";
import Greeting from "@/assets/json/anim/greeting/Greeting.json";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import Button from "@/components/ui/buttons/Button";
import ControlPanel from "@/components/ControlPanel";

export default function HomeScreen() {
  const router = useRouter();
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
      <ControlPanel>
        <Button
          type="text"
          title="Войти"
          onPress={() => router.push("/auth")}
        />
        {/* Сделать такой функционал, что при наличии токена (авторизован) кнопка "Начать", иначе - "Войти" */}
        <ThemedText>
          Нет учетной записи?{" "}
          <ThemedText type="link" onPress={() => router.push("/register")}>
            Зарегистрируйтесь
          </ThemedText>
        </ThemedText>
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
