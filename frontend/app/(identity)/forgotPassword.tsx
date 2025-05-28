import { View, StyleSheet } from "react-native";
import React, { useMemo, useState } from "react";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import FormLayout from "@/components/layouts/form/FormLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import ControlPanel from "@/components/ControlPanel";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/ui/buttons/Button";
import { useRouter } from "expo-router";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { hasAllValues } from "@/utils/functions/Functions";
import { useResetPassword } from "@/hooks/api/auth/useResetPassword";
import * as SecureStorage from "expo-secure-store";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import { LoginRequest } from '@/interfaces/auth/Auth.interface';

export interface IForgotPasswordForm extends Omit<LoginRequest, "password"> {}
const forgotPassword = () => {
  const { mutateAsync: reset_password, isPending: isPendingReset } =
    useResetPassword();
  const {
    control,
    watch,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<IForgotPasswordForm>({
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const isButtonDisabled = useMemo(() => {
    const authValues = watch();

    const hasEmptyFields = !hasAllValues(authValues);
    const hasValidationErrors = !!errors.email;

    return hasEmptyFields || hasValidationErrors;
  }, [watch(), errors, hasAllValues]);

  const router = useRouter();
  const onSubmit: SubmitHandler<IForgotPasswordForm> = ({ email }) => {
    reset_password(
      { email },
      {
        onSuccess: async ({ data }) => {
          const { message, email: responceEmail } = data; //Исправить

          const code = message?.match(/#(\S+)/);
          if (code?.[1]) {
            const resetPasswordData = { code: code[1], email: responceEmail };
            await SecureStorage.setItemAsync(
              SecureStorageKeys.RESET_PASSWORD_DATA,
              JSON.stringify(resetPasswordData)
            );
          }

          router.push("/(identity)/setpassword");
        },
      }
    );
  };

  return (
    <IdentityLayout
      header="Восстановление пароля"
      subtitle="Введите адрес электронной почты, зарегистрированный в вашей учетной записи. Мы отправим вам код для сброса пароля."
    >
      <FormLayout>
        <Controller
          key={"email"}
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
              onChangeText={field.onChange}
              label="Email"
              placeholder="Rhebhek@gmail.com"
              touched={!!touchedFields?.email}
              error={errors.email?.message}
            />
          )}
        />
      </FormLayout>

      <View style={styles.control}>
        <ControlPanel>
          <Button
            type="primary"
            title="Отправить"
            isLoading={isPendingReset}
            disabled={isButtonDisabled}
            onPress={handleSubmit(onSubmit)}
          />
          <ThemedText>
            Вспомнили пароль?{" "}
            <ThemedText type="link" onPress={() => router.push("/auth")}>
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
