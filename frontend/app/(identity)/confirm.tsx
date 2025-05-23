import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import CodeInput from "@/components/input/codeInput/CodeInput";
import ControlPanel from "@/components/ControlPanel";
import Button from "@/components/ui/buttons/Button";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConfirmEmail } from "@/hooks/api/auth/useConfirmEmail";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";

const confirm = () => {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [confirmEmail, setConfirmEmail] = useState<string>("");
  const dispatch = useDispatch();
  const router = useRouter();

  const { showAlert } = useAlert();
  const { mutateAsync: to_confirm_email, isPending } = useConfirmEmail();

  const isButtonDisabled = useMemo(() => {
    return !code.every((item) => item !== "");
  }, [code]);

  const confirmationSendHandler = async () => {
    try {
      const rawData = await AsyncStorage.getItem("confirmData");
      const confirmData: { email: string; code: string } | null = rawData
        ? JSON.parse(rawData)
        : null;

      if (!!confirmData) {
        const { code, email } = confirmData;
        to_confirm_email(
          { email: email, code: code },
          {
            onSuccess: async (data) => {
              await AsyncStorage.setItem("accessToken", data.data.token);
              await AsyncStorage.setItem(
                "refreshToken",
                data.data.refresh_token
              );
              dispatch(setToken(data.data.token));
              router.push("/"); // <- push to home
            },
          }
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  const handlerToAutoComplateConfirmCode = useCallback(async () => {
    try {
      const rawData = await AsyncStorage.getItem("confirmData");
      const confirmData: { email: string; code: string } | null = rawData
        ? JSON.parse(rawData)
        : null;

      if (confirmData && confirmData.code && confirmData.email) {
        setConfirmEmail(confirmData.email);
        showAlert({
          title: `Использовать код подтверждения ${confirmData.code}`,
          buttons: [
            {
              text: "Да",
              onPress: async () => {
                const finalCode = confirmData.code
                  .padEnd(6, " ")
                  .slice(0, 6)
                  .split("");
                setCode(finalCode);
                await AsyncStorage.removeItem("confirmData");
              },
            },
          ],
        });
      }
    } catch (e) {
      console.warn("Ошибка при чтении confirmData:", e);
    }
  }, [setCode, setCode]);

  useEffect(() => {
    handlerToAutoComplateConfirmCode();
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <IdentityLayout
        header="Подтвердите Email"
        subtitle={`Мы отправили письмо на адрес ${confirmEmail}, пожалуйста, введите код ниже.`}
      >
        <CodeInput code={code} onChange={setCode} />

        <View style={styles.control}>
          <ControlPanel>
            <Button
              type="primary"
              title="Отправить"
              disabled={isButtonDisabled}
              isLoading={isPending}
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
