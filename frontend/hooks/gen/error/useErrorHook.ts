import { SecureStorageKeys } from '@/constants/SecureStorage';
import { useRefreshToken } from "@/hooks/api/auth/useRefreshToken";
import * as SecureStorage from "expo-secure-store";
import { AxiosError } from "axios";

export const useErrorHook = (refetchKey?: string[]) => {
  const { mutateAsync: refresh, isPending } = useRefreshToken(refetchKey);

  return {
    onError: async (error?: AxiosError<any, any>) => {
      console.log(error?.response?.data);
      if (error?.response?.status === 401) {
        console.log('qwer')
        const refreshToken = await SecureStorage.getItemAsync(SecureStorageKeys.REFRESH_TOKEN);
        if (!!refreshToken) await refresh({ refresh_token: refreshToken });
        // if (callback) callback();
      }
    },
    isPending,
  };
};
