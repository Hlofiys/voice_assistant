import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import AuthService from '@/services/auth/Auth.service';

export const useResetPassword = () => {
  const { onError } = useErrorHook();
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
