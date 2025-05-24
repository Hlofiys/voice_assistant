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
import * as SecureStorage from "expo-secure-store";
import { useConfirmEmail } from "@/hooks/api/auth/useConfirmEmail";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useDisableGestureEnabled } from "@/hooks/gen/navigation/useDisableGestureEnabled";
import { SecureStorageKeys } from "@/constants/SecureStorage";

const confirm = () => {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [confirmEmail, setConfirmEmail] = useState<string>("");

  useDisableGestureEnabled(); //запрет на навигацию по слайду назад (ios)

  const dispatch = useDispatch();
  const router = useRouter();

  const { showAlert } = useAlert();
  const { mutateAsync: to_confirm_email, isPending } = useConfirmEmail();

  const isButtonDisabled = useMemo(() => {
    return !code.every((item) => item !== "");
  }, [code]);

  const confirmationSendHandler = async () => {
    try {
      const rawData = await SecureStorage.getItemAsync(
        SecureStorageKeys.CONFIRM_DATA
      );
      const confirmData: { email: string; code: string } | null = rawData
        ? JSON.parse(rawData)
        : null;
      if (!!confirmData) {
        const { code, email } = confirmData;
        to_confirm_email(
          { email: email, code: code },
          {
            onSuccess: async ({ data }) => {
              await SecureStorage.setItemAsync(
                SecureStorageKeys.ACCESS_TOKEN,
                data.token
              );
              await SecureStorage.setItemAsync(
                SecureStorageKeys.REFRESH_TOKEN,
                data.refresh_token
              );
              dispatch(setToken(data.token));
              await SecureStorage.deleteItemAsync(
                SecureStorageKeys.CONFIRM_DATA
              );
              router.push("/"); // <- push to home
            },
          }
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handlerToAutoComplateConfirmCode = useCallback(async () => {
    try {
      const rawData = await SecureStorage.getItemAsync(
        SecureStorageKeys.CONFIRM_DATA
      );
      const confirmData: { email: string; code: string } | null = rawData
        ? JSON.parse(rawData)
        : null;

      if (!!confirmData && confirmData.code && confirmData.email) {
        console.log(confirmData);
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
              },
            },
          ],
        });
      }
    } catch (e) {
      console.warn("Ошибка при чтении confirmData:", e);
    }
  }, [setCode, setCode, showAlert]);

  useEffect(() => {
    handlerToAutoComplateConfirmCode();
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <IdentityLayout
        hiddenBackBtn
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
