import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import * as SecureStorage from "expo-secure-store";
import { useDispatch } from "react-redux";
import { setToken } from "@/reduxToolkit/Slices";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import AuthService from "@/services/auth/Auth.service";
import { useRouter } from "expo-router";
import { useAlert } from "@/context/providers/portal.modal/AlertProvider";

export const useRefreshToken = (refetchKey?: string[]) => {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const router = useRouter();
  const { showAlert } = useAlert();

  return useMutation({
    mutationKey: ["refreshToken"],
    mutationFn: AuthService.refreshTokens,
    onSuccess: async (data) => {
      console.log("success to refresh");
      console.log(
        `access: ${data.data.token}\nrefresh: ${data.data.refresh_token}`
      );
      await SecureStorage.setItemAsync(
        SecureStorageKeys.ACCESS_TOKEN,
        data.data.token
      );
      await SecureStorage.setItemAsync(
        SecureStorageKeys.ACCESS_TOKEN,
        data.data.token
      );
      dispatch(setToken(data.data.token));
      if (refetchKey)
        queryClient.invalidateQueries({ queryKey: refetchKey, exact: true }); // Invalidate queries to refetch data
    },
    onError: async (err: AxiosError) => {
      console.log("failed to refresh");
      if (err.response?.status === 401) {
        // console.log('failed')
        //Сброс всех данных по токенам, потому что refresh истёк
        await SecureStorage.deleteItemAsync(SecureStorageKeys.ACCESS_TOKEN);
        await SecureStorage.deleteItemAsync(SecureStorageKeys.REFRESH_TOKEN);
        dispatch(setToken(null));
        showAlert({
          title: "Время входа истекло",
          subtitle: "Чтобы продолжить, войдите в систему заново",
          buttons: [
            {
              text: "Войти",
              onPress: () => {
                router.push("/(identity)/auth");
              },
            },
          ],
        });
      }
      // else {
      //   message.error("An error occurred during token refresh!");
      // }
    },
  });
};
