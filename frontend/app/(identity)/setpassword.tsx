import { View, Text } from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useSetNewPassword } from "@/hooks/api/auth/useSetNewPassword";
import {
  LoginRequest,
  PasswordResetWithCodeRequest,
  PasswordResetWithCodeResponse,
} from "@/api";
import { usePasswordRules } from "@/hooks/gen/password/usePasswordRules";
import FormLayout from "@/components/layouts/form/FormLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import { IslandPopup } from "@/components/modal/popup/IslandPopup";
import { hasAllValues } from "@/utils/functions/Functions";
import ControlPanel from "@/components/ControlPanel";
import Button from "@/components/ui/buttons/Button";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import CodeInput from "@/components/input/codeInput/CodeInput";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";

interface ISetNewPasswordForm
  extends Omit<PasswordResetWithCodeRequest, "code"> {
  //   code: string[];
  confirmPassword?: string;
}
const setpassword = () => {
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [isVisible, setIsVisible] = useState<boolean>(false);

  const { mutateAsync: set_password, isPending: isPendingSetPassword } =
    useSetNewPassword();
  const { showAlert } = useAlert();
  const dispatch = useDispatch();
  const router = useRouter();

  const {
    control,
    watch,
    setValue,
    reset,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<ISetNewPasswordForm>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      //   code: Array(6).fill(""),
      email: "",
      new_password: "",
      confirmPassword: "",
    },
  });

  const setPasswordValues = watch();
  const { isValid, rules } = usePasswordRules(setPasswordValues.new_password);

  const isButtonDisabled = useMemo(() => {
    const hasEmptyFields = !hasAllValues(setPasswordValues);
    const hasValidationErrors =
      setPasswordValues.new_password !== setPasswordValues.confirmPassword;

    return hasEmptyFields || hasValidationErrors || !isValid;
  }, [setPasswordValues, errors, rules]);

  const handlerToAutoComplateConfirmCode = useCallback(async () => {
    try {
      const rawData = await AsyncStorage.getItem("resetPasswordData");
      const resetPasswordData: { email: string; code: string } | null = rawData
        ? JSON.parse(rawData)
        : null;

      if (
        resetPasswordData &&
        resetPasswordData.code &&
        resetPasswordData.email
      ) {
        showAlert({
          title: `Использовать код подтверждения ${resetPasswordData.code}`,
          buttons: [
            {
              text: "Да",
              onPress: async () => {
                const finalCode = resetPasswordData.code
                  .padEnd(6, " ")
                  .slice(0, 6)
                  .split("");
                setCode(finalCode);
                setValue("email", resetPasswordData.email);
                // setValue("code", finalCode);
                await AsyncStorage.removeItem("resetPasswordData");
              },
            },
          ],
        });
      }
    } catch (e) {
      console.warn("Ошибка при чтении confirmData:", e);
    }
  }, [showAlert, setCode]);

  useEffect(() => {
    handlerToAutoComplateConfirmCode();
  }, []);

  const onSubmit: SubmitHandler<ISetNewPasswordForm> = 
    (data) => {
      const { email, new_password } = data;
      const setNewPasswordData: PasswordResetWithCodeRequest = {
        code: code.join(""),
        email,
        new_password,
      };

      set_password(setNewPasswordData, {
        onSuccess: async ({ data }) => {
          const { refresh_token, token } = data;
          showAlert({
            title: "Сохранить измененный пароль?",
            subtitle: "Это поможет вам проще зайти в аккаунт в следующий раз",
            buttons: [
              {
                text: "Нет",
                style: "cancel", // iOS делает кнопку жирной и слева
              },
              {
                text: "Да",
                onPress: async () => {
                  const userData: LoginRequest = {
                    email,
                    password: new_password,
                  };
                  await AsyncStorage.setItem(
                    "userAuth",
                    JSON.stringify(userData)
                  );
                },
                style: "destructive", // или опусти — по умолчанию
              },
            ],
          });

          await AsyncStorage.setItem("accessToken", token);
          await AsyncStorage.setItem("refreshToken", refresh_token);
          dispatch(setToken(token));
          reset();
          router.push("/");
        },
      });
    }

  return (
    <IdentityLayout header="Установите новый пароль">
      <FormLayout>
        <CodeInput
          code={code}
          onChange={setCode}
          //   code={setPasswordValues.code}
          //   onChange={(value) => setValue("code", value as string[])}
          gap={4}
        />
        <Controller
          name="new_password"
          control={control}
          render={({ field }) => (
            <ThemedInput
              {...field}
              label="Новый пароль"
              placeholder="********"
              isPassword
              onChangeText={field.onChange}
              onFocus={() => setIsVisible(true)}
              onBlur={() => setIsVisible(false)}
              textContentType="oneTimeCode"
              autoComplete="off"
              autoCorrect={false}
              error={
                errors.new_password?.message || "Введите корректный пароль"
              }
            />
          )}
        />
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <ThemedInput
              {...field}
              label="Подтвердите пароль"
              placeholder="********"
              isPassword
              onChangeText={field.onChange}
              textContentType="oneTimeCode"
              autoComplete="off"
              autoCorrect={false}
              error={
                setPasswordValues.new_password !==
                setPasswordValues.confirmPassword
                  ? "Пароли не совпадают"
                  : undefined
              }
            />
          )}
        />
      </FormLayout>
      <ControlPanel>
        <Button
          type="primary"
          title="Установить пароль"
          disabled={isButtonDisabled}
          isLoading={isPendingSetPassword}
          onPress={handleSubmit(onSubmit)}
        />
      </ControlPanel>
      <IslandPopup visible={isVisible} rules={rules} />
    </IdentityLayout>
  );
};

export default setpassword;
