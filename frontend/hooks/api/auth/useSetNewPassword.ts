import { useMutation } from "@tanstack/react-query";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import AuthService from "@/services/auth/Auth.service";

export const useSetNewPassword = () => {
  const { onError } = useErrorHook();

  return useMutation({
    mutationKey: ["setNewPassword"],
    mutationFn: AuthService.resetPasswordWithCode,
    onError,
  });
};
