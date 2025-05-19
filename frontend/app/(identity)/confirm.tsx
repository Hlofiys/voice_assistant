import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import React, { useCallback, useMemo, useState } from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import CodeInput from "@/components/input/codeInput/CodeInput";
import ControlPanel from "@/components/ControlPanel";
import Button from "@/components/ui/buttons/Button";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";

const confirm = () => {
  const [code, setCode] = useState(Array(6).fill(""));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleCodeChange = (newCode: string[]) => {
    setCode(newCode);
  };

  const isButtonDisabled = useMemo(() => {
    return !code.every((item) => item !== "");
  }, [code]);

  const confirmationSendHandler = useCallback(() => {
    setIsLoading(true);

    console.log(code);

    setTimeout(() => {
      setIsLoading(false);
      router.push("/auth");
    }, 3000);
  }, [code, setIsLoading]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <IdentityLayout
        header="Подтвердите Email"
        subtitle="Мы отправили письмо на адрес becca@gmail.com, пожалуйста, введите код ниже."
        //заменить на нужный email
      >
        <CodeInput code={code} onChange={handleCodeChange} />

        <View style={styles.control}>
          <ControlPanel>
            <Button
              type="text"
              title="Отправить"
              disabled={isButtonDisabled}
              isLoading={isLoading}
              onPress={confirmationSendHandler}
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
