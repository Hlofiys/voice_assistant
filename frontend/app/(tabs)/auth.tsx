import Button from "@/components/buttons/Button";
import ControlPanel from "@/components/ControlPanel";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import FormLayout from "@/components/layouts/form/FormLayout";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { View } from "react-native";

const auth = () => {
  const router = useRouter();
  return (
    <IdentityLayout header="Авторизация">
      <FormLayout>
        <ThemedInput label="Email" placeholder="Rhebhek@gmail.com" />
        <ThemedInput
          label="Пароль"
          placeholder="********"
          textContentType="password"
          secureTextEntry={true}
          isShowForgotPassword
          error="Введите корректный пароль"
        />
      </FormLayout>

      <View style={styles.control}>
        <Checkbox label="Запомнить меня" />
        <ControlPanel>
          <Button
            type="text"
            title="Войти"
            disabled
          />
          <ThemedText>
            Нет учетной записи?{" "}
            <ThemedText type="link" onPress={() => router.push("/register")}>
              Зарегистрируйтесь
            </ThemedText>
          </ThemedText>
        </ControlPanel>
      </View>
    </IdentityLayout>
  );
};

export default auth;

const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
