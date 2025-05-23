import { useMutation } from "@tanstack/react-query";
import { useAuthApi } from "./useAuthApi.instance";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import { AxiosResponse } from "axios";
import { Logout200Response } from "@/api";

export const useLogout = () => {
  const { onError, isPending } = useErrorHook();
  const instance = useAuthApi();

  return useMutation<AxiosResponse<Logout200Response>, unknown, void>({
    mutationKey: ["useLogout"],
    mutationFn: () => instance.logout(),
    onError: (err) => onError(err as any),
  });
};
