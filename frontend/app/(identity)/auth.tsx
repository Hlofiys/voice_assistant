import Button from "@/components/ui/buttons/Button";
import ControlPanel from "@/components/ControlPanel";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import FormLayout from "@/components/layouts/form/FormLayout";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import { ThemedText } from "@/components/ThemedText";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet } from "react-native";
import { View } from "react-native";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { hasAllValues } from "@/utils/functions/Functions";
import * as SecureStorage from "expo-secure-store";
import { LoginRequest } from "@/api";
import { useLogin } from "@/hooks/api/auth/useLogin";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import { AxiosError } from "axios";
import { SecureStorageKeys } from "@/constants/SecureStorage";

const auth = () => {
  const [saveMeStatus, setSaveMeStatus] = useState<boolean>(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const {
    control,
    watch,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, touchedFields },
  } = useForm<LoginRequest>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutateAsync: login, isPending } = useLogin();
  const { showAlert } = useAlert();

  const isButtonDisabled = useMemo(() => {
    const authValues = watch();

    const hasEmptyFields = !hasAllValues(authValues);
    const hasValidationErrors = !!errors.email || !!errors.password;

    return hasEmptyFields || hasValidationErrors;
  }, [watch(), errors, hasAllValues]);

  const onSubmit: SubmitHandler<LoginRequest> = async (data) => {
    const formData = data;
    login(formData, {
      onSuccess: async ({ data }) => {
        console.log("success auth");
        if (saveMeStatus) {
          await SecureStorage.setItemAsync(
            SecureStorageKeys.USER_AUTH,
            JSON.stringify(formData)
          );
        } // установка нового логина и пароля при успешной регистрации
        await SecureStorage.setItemAsync(
          SecureStorageKeys.ACCESS_TOKEN,
          data.token
        );
        await SecureStorage.setItemAsync(
          SecureStorageKeys.REFRESH_TOKEN,
          data.refresh_token
        );
        dispatch(setToken(data.token));
        setSaveMeStatus(false);
        reset();
        router.push("/"); //<- pushed to home page
      },
    });
  };

  const handlerToAutoComplateSaveData = useCallback(async () => {
    const savedData =
      (await SecureStorage.getItemAsync(SecureStorageKeys.USER_AUTH)) ?? "";
    const parsedSavedData: LoginRequest = JSON.parse(savedData);
    if (!!parsedSavedData) {
      showAlert({
        title: "Использовать сохраненные данные ?",
        buttons: [
          {
            text: "Нет",
            style: "cancel", // iOS делает кнопку жирной и слева
          },
          {
            text: "Да",
            onPress: () => {
              console.log(parsedSavedData);
              setValue("email", parsedSavedData.email);
              setValue("password", parsedSavedData.password);
            },
            style: "destructive", // или опусти — по умолчанию
          },
        ],
      });
    }
  }, [setValue, showAlert]);

  useEffect(() => {
    handlerToAutoComplateSaveData();
  }, []);

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
              isShowForgotPassword
              placeholder="********"
              isPassword
              textContentType="oneTimeCode"
              autoComplete="off"
              error="Введите корректный пароль"
            />
          )}
        />
      </FormLayout>

      <View style={styles.control}>
        <Checkbox
          label="Запомнить меня"
          checked={saveMeStatus}
          onChange={(event) => setSaveMeStatus(event)}
        />
        <ControlPanel>
          <Button
            type="primary"
            title="Войти"
            isLoading={isPending}
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
