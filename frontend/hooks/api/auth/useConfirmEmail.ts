import {
  AuthenticationApi,
  ConfirmEmailRequest,
  ConfirmEmailResponse,
} from "@/api";
import { useAxiosConfiguration } from "@/config/api.config/ApiConfig";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { useMutation } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

export const useConfirmEmail = () => {
  const { onError } = useErrorHook();
  const config = useAxiosConfiguration();
  const instance = new AuthenticationApi(config);

  return useMutation<
    AxiosResponse<ConfirmEmailResponse>,
    unknown,
    ConfirmEmailRequest
  >({
    mutationKey: ["confirmEmail"],
    mutationFn: instance.confirmEmail,
    onError: (err) => onError(err as any),
  });
};
