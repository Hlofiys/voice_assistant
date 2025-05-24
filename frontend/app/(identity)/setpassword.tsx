import { View } from "react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { useSetNewPassword } from "@/hooks/api/auth/useSetNewPassword";
import {
  LoginRequest,
  PasswordResetWithCodeRequest,
} from "@/api";
import { usePasswordRules } from "@/hooks/gen/password/usePasswordRules";
import FormLayout from "@/components/layouts/form/FormLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import { IslandPopup } from "@/components/modal/popup/IslandPopup";
import { hasAllValues } from "@/utils/functions/Functions";
import ControlPanel from "@/components/ControlPanel";
import Button from "@/components/ui/buttons/Button";
import { useRouter } from "expo-router";
import CodeInput from "@/components/input/codeInput/CodeInput";
import * as SecureStorage from "expo-secure-store";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";
import { SecureStorageKeys } from "@/constants/SecureStorage";

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
      const rawData = await SecureStorage.getItemAsync(
        SecureStorageKeys.RESET_PASSWORD_DATA
      );
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

  const onSubmit: SubmitHandler<ISetNewPasswordForm> = (data) => {
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
                await SecureStorage.setItemAsync(
                  SecureStorageKeys.USER_AUTH,
                  JSON.stringify(userData)
                );
              },
              style: "destructive", // или опусти — по умолчанию
            },
          ],
        });

        await SecureStorage.setItemAsync(SecureStorageKeys.ACCESS_TOKEN, token);
        await SecureStorage.setItemAsync(
          SecureStorageKeys.REFRESH_TOKEN,
          refresh_token
        );
        await SecureStorage.deleteItemAsync(
          SecureStorageKeys.RESET_PASSWORD_DATA
        );
        dispatch(setToken(token));
        reset();
        router.push("/");
      },
    });
  };

  return (
    <IdentityLayout header="Установите новый пароль">
      <View style={{ width: "100%", display: "flex", gap: 90 }}>
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
            rules={{
              pattern: {
                value: /^(?=.*[A-ZА-Я])(?=.*\d).{8,}$/,
                message: "Введите корректный пароль",
              },
            }}
            render={({ field }) => (
              <ThemedInput
                {...field}
                label="Пароль"
                placeholder="********"
                isPassword
                touched={!!touchedFields?.new_password && !isVisible}
                onChangeText={field.onChange}
                onFocus={() => setIsVisible(true)}
                onBlur={() => {
                  field.onBlur();
                  setIsVisible(false);
                }}
                textContentType="oneTimeCode"
                autoComplete="off"
                autoCorrect={false}
                error={errors.new_password?.message}
              />
            )}
          />

          <Controller
            name="confirmPassword"
            control={control}
            rules={{
              validate: (value) =>
                value === setPasswordValues.new_password ||
                "Пароли не совпадают",
            }}
            render={({ field }) => (
              <ThemedInput
                {...field}
                label="Подтвердите пароль"
                placeholder="********"
                isPassword
                touched={!!touchedFields?.confirmPassword}
                onChangeText={field.onChange}
                textContentType="oneTimeCode"
                autoComplete="off"
                autoCorrect={false}
                error={errors.confirmPassword?.message}
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
      </View>

      <IslandPopup visible={isVisible} rules={rules} />
    </IdentityLayout>
  );
};

export default setpassword;
