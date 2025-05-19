import { View, StyleSheet } from "react-native";
import React, { useMemo, useState } from "react";
import { ThemedText } from "@/components/ThemedText";
import Button from "@/components/ui/buttons/Button";
import { useRouter } from "expo-router";
import IdentityLayout from "@/components/layouts/identity/IdentityLayout";
import ThemedInput from "@/components/input/themedInput/ThemedInput";
import FormLayout from "@/components/layouts/form/FormLayout";
import Checkbox from "@/components/input/checkbox/Checkbox";
import ControlPanel from "@/components/ControlPanel";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { IBasicAuth } from "./auth";
import { hasAllValues } from "@/utils/functions/Functions";
import { IslandPopup } from "@/components/modal/popup/IslandPopup";
// import { PasswordStrengthModal } from "@/components/modal/animationPassword/AnimationPassword";

interface IRegisterForm extends IBasicAuth {
  confirmPassword: string;
  isConfirmedPrivacyPolicy?: boolean;
}
const register = () => {
  const [isLoading, setisLoading] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const router = useRouter();

  const {
    control,
    watch,
    handleSubmit,
    formState: { errors, touchedFields },
  } = useForm<IRegisterForm>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      isConfirmedPrivacyPolicy: false,
    },
  });

  const password = watch("password");
  const rules: { name: string; completed: boolean }[] = [
    { name: "Минимум 8 символов", completed: password.length >= 8 },
    { name: "Заглавные буквы", completed: /[A-ZА-Я]/.test(password) },
    { name: "Цифры", completed: /\d/.test(password) },
  ];

  const isButtonDisabled = useMemo(() => {
    const authValues = watch();

    const hasEmptyFields = !hasAllValues(authValues);
    const hasValidationErrors =
      !!errors.email || authValues.password !== authValues.confirmPassword;

    return hasEmptyFields || hasValidationErrors;
  }, [watch(), errors, hasAllValues]);

  const onSubmit: SubmitHandler<IRegisterForm> = (data) => {
    setisLoading(true);
    console.log(data);

    setTimeout(() => {
      setisLoading(false);
      router.push("/confirm");
    }, 3000);
  };

  return (
    <IdentityLayout header="Регистрация">
      <FormLayout>
        {/* <Controller
          key={"fullName"}
          name="fullName"
          control={control}
          rules={{
            validate: (value: string) => {
              const words = value.trim().split(/\s+/);
              if (words.length !== 2) {
                return "Введите фамилию и имя через пробел";
              }
              return true;
            },
          }}
          render={({ field }) => {
            const handleChange = (text: string) => {
              // Автоисправление: каждое слово с большой буквы
              const corrected = text
                .split(/\s+/)
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                )
                .join(" ");
              field.onChange(corrected);
            };
            return (
              <ThemedInput
                {...field}
                label="Полное имя"
                placeholder="Иванов Иван"
                onChangeText={handleChange}
                touched={!!touchedFields?.fullName}
                error={errors.fullName?.message}
              />
            );
          }}
        /> */}
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
              label="Email"
              onChangeText={field.onChange}
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
              onFocus={() => setIsVisible(true)}
              onBlur={() => setIsVisible(false)}
              placeholder="********"
              isPassword
              textContentType="none"
              autoComplete="off"
              autoCorrect={false}
              error="Введите корректный пароль"
            />
          )}
        />
        <Controller
          key={"confirmPassword"}
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <ThemedInput
              {...field}
              onChangeText={field.onChange}
              label="Подтвердите пароль"
              placeholder="********"
              isPassword
              textContentType="none"
              autoComplete="off"
              autoCorrect={false}
              error="Введите корректный пароль"
            />
          )}
        />
      </FormLayout>
      <View style={styles.control}>
        <Controller
          key={"isConfirmedPrivacyPolicy"}
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
            type="text"
            title="Регистрироваться"
            disabled={isButtonDisabled}
            isLoading={isLoading}
            onPress={handleSubmit(onSubmit)}
            // onPress={() => router.push("/confirm")}
          />
          <ThemedText>
            Есть учетная запись?{" "}
            <ThemedText type="link" onPress={() => router.push("/auth")}>
              Войти
            </ThemedText>
          </ThemedText>
        </ControlPanel>
      </View>
      {/* <PasswordStrengthModal
        visible={isVisible}
        rulesState={[
          password.length >= 8,
          /[A-Z]/.test(password),
          /\d/.test(password),
          /[!@#$%^&*(),.?":{}|<>]/.test(password),
          !/\s/.test(password),
        ]}
      /> */}
      {isVisible && <IslandPopup visible={isVisible} rules={rules} />}
    </IdentityLayout>
  );
};

export default register;
const styles = StyleSheet.create({
  control: {
    width: "100%",
    display: "flex",
    gap: 16,
  },
});
