import { useMutation } from "@tanstack/react-query";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import AuthService from "@/services/auth/Auth.service";

export const useLogout = () => {
  const { onError } = useErrorHook();

  return useMutation({
    mutationKey: ["useLogout"],
    mutationFn: AuthService.logout,
    onError,
  });
};
