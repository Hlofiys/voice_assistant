import { SecureStorageKeys } from "@/constants/SecureStorage";
import { useRefreshToken } from "@/hooks/api/auth/useRefreshToken";
import * as SecureStorage from "expo-secure-store";
import { AxiosError } from "axios";

export const useErrorHook = (refetchKey?: string[]) => {
  const { mutateAsync: refresh, isPending } = useRefreshToken(refetchKey);

  return {
    onError: async (
      error: AxiosError<any, any>,
      callback?: () => Promise<void>
    ) => {
      console.log(error?.response?.status);
      if (error?.response?.status === 401) {
        const refreshToken = await SecureStorage.getItemAsync(
          SecureStorageKeys.REFRESH_TOKEN
        );
        if (!!refreshToken) {
          try {
            await refresh({ refresh_token: refreshToken });
            console.log("✅ Токен обновлён");

            if (callback) {
              console.log("🔁 Повтор запроса после обновления токена");
              await callback(); // Повтор запроса
            } 
          } catch (e) {
            console.error("❌ Ошибка при обновлении токена", e);
          }
        }
      }
    },
    isPending,
  };
};
