import Button from "@/components/ui/buttons/Button";
import ControlPanel from "@/components/ControlPanel";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import FormLayout from "@/components/layouts/form/FormLayout";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { View } from "react-native";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { hasAllValues } from "@/utils/functions/Functions";

export interface IBasicAuth {
  email: string;
  password: string;
}
const auth = () => {
  const router = useRouter();
  const {
    control,
    watch,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<IBasicAuth>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isButtonDisabled = useMemo(() => {
    const authValues = watch();

    const hasEmptyFields = !hasAllValues(authValues);
    const hasValidationErrors = !!errors.email || !!errors.password;

    return hasEmptyFields || hasValidationErrors;
  }, [watch(), errors, hasAllValues]);

  const onSubmit: SubmitHandler<IBasicAuth> = (data) => {
    console.log(data);
  };

  return (
    <IdentityLayout header="Авторизация">
      <FormLayout>
        <Controller
          name="email"
          key="email"
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
        <Controller
          key={"password"}
          name="password"
          control={control}
          render={({ field }) => (
            <ThemedInput
              {...field}
              onChangeText={field.onChange}
              label="Пароль"
              placeholder="********"
              textContentType="password"
              isShowForgotPassword
              error="Введите корректный пароль"
            />
          )}
        />
      </FormLayout>

      <View style={styles.control}>
        {/* <Checkbox label="Запомнить меня" /> */}
        <ControlPanel>
          <Button
            type="text"
            title="Войти"
            disabled={isButtonDisabled}
            onPress={handleSubmit(onSubmit)}
          />
          <ThemedText>
            Нет учетной записи?{" "}
            <ThemedText type="link" onPress={() => router.push("/register")}>
              Зарегистрируйтесь
            </ThemedText>
          </ThemedText>
        </ControlPanel>
      </View>
    </IdentityLayout>
  );
};

export default auth;

const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
