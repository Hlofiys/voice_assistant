import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { useMutation } from "@tanstack/react-query";
import { useAuthApi } from "./useAuthApi.instance";
import { AxiosError } from "axios";
import { subscribe } from "expo-router/build/link/linking";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import AuthService from '@/services/auth/Auth.service';

export const useResetPassword = () => {
  const { onError } = useErrorHook();
  // const instance = useAuthApi();
  const { showAlert } = useAlert();
  return useMutation({
    mutationKey: ["resetPassword"],
    mutationFn: AuthService.requestPasswordResetCode,
    onError: (err: AxiosError<any, any>) => {
      if (err.response?.status === 404) {
        showAlert({
          title: "Такого пользователя не существует",
          subtitle: `Вы ввели некорректный email`,
        });
      }
      onError(err);
    },
  });
};
