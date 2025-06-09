import { useMutation } from "@tanstack/react-query";
import { useErrorHook } from "@/hooks/gen/error/useErrorHook";
import AuthService from "@/services/auth/Auth.service";
import { AxiosError } from "axios";

import * as SecureStorage from "expo-secure-store";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";

export const useLogout = () => {
  const { onError } = useErrorHook();
  const dispatch = useDispatch();

  const mutation = useMutation({
    mutationKey: ["useLogout"],
    mutationFn: AuthService.logout,
    onSuccess: async () => {
      await SecureStorage.deleteItemAsync(SecureStorageKeys.ACCESS_TOKEN);
      await SecureStorage.deleteItemAsync(SecureStorageKeys.REFRESH_TOKEN);
      dispatch(setToken(null));
    },
    onError: (err: AxiosError, variables) => {
      onError(err, async () => {
        await mutation.mutateAsync(variables); // logout без параметров
      });
    },
  });

  return mutation;
};
