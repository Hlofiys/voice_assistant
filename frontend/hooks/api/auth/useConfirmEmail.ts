import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { ConfirmEmailRequest, ConfirmEmailResponse } from '@/interfaces/auth/Auth.interface';
import AuthService from "@/services/auth/Auth.service";
import { useMutation } from "@tanstack/react-query";
import { AxiosResponse } from "axios";

export const useConfirmEmail = () => {
  const { onError } = useErrorHook();

  return useMutation<
    AxiosResponse<ConfirmEmailResponse>,
    unknown,
    ConfirmEmailRequest
  >({
    mutationKey: ["confirmEmail"],
    mutationFn: AuthService.confirmEmail,
    onError: (err) => onError(err as any),
  });
};
