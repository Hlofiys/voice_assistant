import { View, StyleSheet } from "react-native";
import React from "react";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/buttons/Button";
import { useRouter } from "expo-router";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import FormLayout from "@/components/layouts/form/FormLayout";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ControlPanel from "@/components/ControlPanel";

const register = () => {
  const router = useRouter();
  return (
    <IdentityLayout header="Регистрация">
      <FormLayout>
        <ThemedInput label="Полное имя" placeholder="Иванов Иван" />
        <ThemedInput label="Email" placeholder="Rhebhek@gmail.com" />
        <ThemedInput
          label="Пароль"
          placeholder="********"
          textContentType="password"
          secureTextEntry={true}
          error="Введите корректный пароль"
        />
        <ThemedInput
          label="Подтвердите пароль"
          placeholder="********"
          textContentType="password"
          secureTextEntry={true}
          error="Введите корректный пароль"
        />
      </FormLayout>

      <View style={styles.control}>
        <Checkbox label="Я принимаю условия использования и политику конфиденциальности" />
        <ControlPanel>
          <Button
            type="text"
            title="Регистрироваться"
            disabled
            // onPress={() => router.push("/auth")}
          />
          <ThemedText>
            Есть учетная запись?{" "}
            <ThemedText type="link" onPress={() => router.push("/auth")}>
              Войти
            </ThemedText>
          </ThemedText>
        </ControlPanel>
      </View>
    </IdentityLayout>
  );
};

export default register;
const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
