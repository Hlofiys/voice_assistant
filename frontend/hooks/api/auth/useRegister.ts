import { useAxiosConfiguration } from "@/config/api.config/ApiConfig";
import { AuthenticationApi, RegisterRequest } from "@/api";
import { useMutation } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import axios, { AxiosError } from "axios";
import { useAuthApi } from "./useAuthApi.instance";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";

export const useRegister = () => {
  const { onError } = useErrorHook();
  const instance = useAuthApi();
  const { showAlert } = useAlert();
  return useMutation({
    mutationKey: ["registerUser"],
    mutationFn: instance.register,
    // mutationFn: (data: RegisterRequest)=>axios.post('https://assistant.hlofiys.xyz/api/auth/register', data),
    onError: (err: AxiosError<any, any>) => {
      showAlert({title: 'Пользователь с таким email уже существует'});
      onError(err);
    },
  });
};
