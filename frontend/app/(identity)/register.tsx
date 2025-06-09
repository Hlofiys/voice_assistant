import { View, StyleSheet, Platform } from "react-native";
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "expo-router";
import * as SecureStorage from "expo-secure-store";
import { Controller, SubmitHandler, useForm } from "react-hook-form";

import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/ui/buttons/Button";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import FormLayout from "@/components/layouts/form/FormLayout";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ControlPanel from "@/components/ControlPanel";
import { IslandPopup } from "@/components/modal/popup/IslandPopup";

import { useRegister } from "@/hooks/api/auth/useRegister";
import { hasAllValues } from "@/utils/functions/Functions";

import { usePasswordRules } from "@/hooks/gen/password/usePasswordRules";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import { RegisterRequest } from "@/interfaces/auth/Auth.interface";

interface IRegisterForm extends RegisterRequest {
  confirmPassword: string;
  isConfirmedPrivacyPolicy?: boolean;
}

const Register = () => {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  const {
    control,
    watch,
    reset,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<IRegisterForm>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      isConfirmedPrivacyPolicy: false,
    },
  });

  const { mutateAsync: register, isPending } = useRegister();

  const allValues = watch();
  const password = watch("password");
  const { isValid, rules } = usePasswordRules(password);

  const isButtonDisabled = useMemo(() => {
    const hasEmptyFields = !hasAllValues(allValues);
    const hasValidationErrors =
      !!errors.email || allValues.password !== allValues.confirmPassword;

    return hasEmptyFields || hasValidationErrors || !isValid;
  }, [allValues, errors, rules]);

  useEffect(() => console.log(touchedFields.email), [touchedFields.email]);

  const onSubmit: SubmitHandler<IRegisterForm> = useCallback(
    (data) => {
      const { email, password } = data;
      const registerData: RegisterRequest = { email, password };

      register(registerData, {
        onSuccess: async ({ data }) => {
          const { message } = data;
          const code = message.match(/#(\S+)/);
          if (code?.[1]) {
            const confirmData = { code: code[1], email };
            await SecureStorage.setItemAsync(
              SecureStorageKeys.CONFIRM_DATA,
              JSON.stringify(confirmData)
            );
            console.log("set confirm data: ", confirmData);
          }
          router.push("/confirm");
          reset();
        },
      });
    },
    [register, reset, router]
  );

  return (
    <IdentityLayout header="Регистрация">
      <FormLayout>
        <Controller
          name="email"
          control={control}
          rules={{
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Некорректный email",
            },
          }}
          render={({ field }) => (
            <ThemedInput
              {...field}
              label="Email"
              placeholder="Rhebhek@gmail.com"
              onChangeText={field.onChange}
              touched={!!touchedFields?.email}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          name="password"
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
              touched={!!touchedFields?.password && !isVisible}
              onChangeText={field.onChange}
              onFocus={() => setIsVisible(true)}
              onBlur={() => {
                field.onBlur();
                setIsVisible(false);
              }}
              textContentType={
                Platform.OS === "android" ? "password" : "oneTimeCode"
              }
              autoComplete="off"
              autoCorrect={false}
              error={errors.password?.message}
            />
          )}
        />

        <Controller
          name="confirmPassword"
          control={control}
          rules={{
            validate: (value) => value === password || "Пароли не совпадают",
          }}
          render={({ field }) => (
            <ThemedInput
              {...field}
              label="Подтвердите пароль"
              placeholder="********"
              isPassword
              touched={!!touchedFields?.confirmPassword}
              onChangeText={field.onChange}
              textContentType={
                Platform.OS === "android" ? "password" : "oneTimeCode"
              }
              autoComplete="off"
              autoCorrect={false}
              error={errors.confirmPassword?.message}
            />
          )}
        />
      </FormLayout>

      <View style={styles.control}>
        <Controller
          name="isConfirmedPrivacyPolicy"
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={field.value}
              onChange={field.onChange}
              label="Я принимаю условия использования и политику конфиденциальности"
            />
          )}
        />

        <ControlPanel>
          <Button
            type="primary"
            title="Регистрироваться"
            disabled={isButtonDisabled}
            isLoading={isPending}
            onPress={handleSubmit(onSubmit)}
          />

          <ThemedText>
            Есть учетная запись?{" "}
            <ThemedText type="link" onPress={() => router.push("/auth")}>
              Войти
            </ThemedText>
          </ThemedText>
        </ControlPanel>
      </View>

      <IslandPopup visible={isVisible} rules={rules} />
    </IdentityLayout>
  );
};

export default Register;

const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
