import { useAxiosConfiguration } from "@/config/api.config/ApiConfig";
import { AuthenticationApi } from "@/api";
import { useMutation } from "@tanstack/react-query";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { AxiosError } from "axios";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
export const useLogin = () => {
  const config = useAxiosConfiguration();
  const instance = new AuthenticationApi(config);
  const { showAlert } = useAlert();
  return useMutation({
    mutationKey: ["loginUser"],
    mutationFn: instance.login,
    onError: (error: AxiosError<any, any>) => {
      if (error.response?.status === 401) {
        showAlert({
          title: 'Ошибка',
          subtitle: "Неверный логин или пароль"
        })
      }
    },
  });
};
