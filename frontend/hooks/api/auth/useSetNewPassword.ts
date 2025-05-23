import { useMutation } from "@tanstack/react-query";
import { useAuthApi } from "./useAuthApi.instance";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";

export const useSetNewPassword = () => {
  const { onError } = useErrorHook();
  const instance = useAuthApi();

  return useMutation({
    mutationKey: ["setNewPassword"],
    mutationFn: instance.resetPasswordWithCode,
    onError,
  });
};
