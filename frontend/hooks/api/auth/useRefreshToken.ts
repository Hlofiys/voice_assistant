import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useAuthApi } from "./useAuthApi.instance";
import * as SecureStorage from "expo-secure-store";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";
import { SecureStorageKeys } from "@/constants/SecureStorage";

export const useRefreshToken = (refetchKey?: string[]) => {
  const instance = useAuthApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationKey: ["refreshToken"],
    mutationFn: instance.refreshTokens,
    onSuccess: async (data) => {
      console.log("success to refresh");
      await SecureStorage.setItemAsync(
        SecureStorageKeys.ACCESS_TOKEN,
        data.data.token
      );
      await SecureStorage.setItemAsync(
        SecureStorageKeys.ACCESS_TOKEN,
        data.data.token
      );
      if (refetchKey)
        queryClient.invalidateQueries({ queryKey: refetchKey, exact: true }); // Invalidate queries to refetch data
    },
    onError: async (err: AxiosError) => {
      console.log("failed to refresh");
      if (err.response?.status === 401) {
        //Сброс всех данных по токенам, потому что refresh истёк
        await SecureStorage.deleteItemAsync(SecureStorageKeys.ACCESS_TOKEN);
        await SecureStorage.deleteItemAsync(SecureStorageKeys.REFRESH_TOKEN);
        dispatch(setToken(null));
      }
      // else {
      //   message.error("An error occurred during token refresh!");
      // }
    },
  });
};
