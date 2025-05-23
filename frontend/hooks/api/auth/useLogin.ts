import { useAxiosConfiguration } from "@/config/api.config/ApiConfig";
import { AuthenticationApi } from "@/api";
import { useMutation } from "@tanstack/react-query";
import { useErrorHook } from '@/hooks/gen/error/useErrorHook';
export const useLogin = () => {
  const { onError } = useErrorHook();
  const config = useAxiosConfiguration();
  const instance = new AuthenticationApi(config);
  return useMutation({
    mutationKey: ['loginUser'],
    mutationFn: instance.login,
    onError
  });
};
