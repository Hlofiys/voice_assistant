import { useMutation } from "@tanstack/react-query";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { AxiosError } from "axios";
import { useAuthApi } from "./useAuthApi.instance";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";
import AuthService from '@/services/auth/Auth.service';

export const useRegister = () => {
  const { onError } = useErrorHook();
  const instance = useAuthApi();
  const { showAlert } = useAlert();
  return useMutation({
    mutationKey: ["registerUser"],
    mutationFn: AuthService.register,
    onError: (err: AxiosError<any, any>) => {
      showAlert({title: 'Пользователь с таким email уже существует'});
      onError(err);
    },
  });
};
