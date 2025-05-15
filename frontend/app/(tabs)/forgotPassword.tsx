import { View, Text, StyleSheet } from "react-native";
import React from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import FormLayout from "@/components/layouts/form/FormLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ControlPanel from "@/components/ControlPanel";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/buttons/Button";
import { useRouter } from "expo-router";

const forgotPassword = () => {
  const router = useRouter();
  return (
    <IdentityLayout
      header="Восстановление пароля"
      subtitle="Введите адрес электронной почты, зарегистрированный в вашей учетной записи. Мы отправим вам код для сброса пароля."
    >
      <FormLayout>
        <ThemedInput label="Email" placeholder="Rhebhek@gmail.com" />
      </FormLayout>

      <View style={styles.control}>
        <ControlPanel>
          <Button
            type="text"
            title="Отправить"
            onPress={() => router.push("/confirm")}
          />
          <ThemedText>
            Вспомнили пароль?{" "}
            <ThemedText type="link" onPress={() => router.push("/register")}>
              Авторизоваться
            </ThemedText>
          </ThemedText>
        </ControlPanel>
      </View>
    </IdentityLayout>
  );
};

export default forgotPassword;
const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
