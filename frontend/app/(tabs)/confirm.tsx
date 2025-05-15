import { View, Text, StyleSheet, TouchableWithoutFeedback, Keyboard } from "react-native";
import React from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import CodeInput from "@/components/input/codeInput/CodeInput";
import ControlPanel from "@/components/ControlPanel";
import Button from "@/components/buttons/Button";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";

const confirm = () => {
  const router = useRouter();
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <IdentityLayout
        header="Подтвердите Email"
        subtitle="Мы отправили письмо на адрес becca@gmail.com, пожалуйста, введите код ниже."
        //заменить на нужный email
      >
        <CodeInput />

        <View style={styles.control}>
          <ControlPanel>
            <Button
              type="text"
              title="Отправить"
              onPress={() => router.push("/confirm")}
            />
            <ThemedText>
              Не получили код?{" "}
              <ThemedText type="link">Отправить заново</ThemedText>
            </ThemedText>
          </ControlPanel>
        </View>
      </IdentityLayout>
    </TouchableWithoutFeedback>
  );
};

export default confirm;
const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
