import { RefreshRequest, RegisterRequest } from "@/api";
import { useRefreshToken } from "@/hooks/api/auth/useRefreshToken";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AxiosError } from "axios";
// import { useRefreshToken } from "../../b2b/api/hooks/identity/useRefreshToken";

export const useErrorHook = (refetchKey?: string[]) => {
  const { mutateAsync: refresh, isPending } = useRefreshToken(refetchKey);

  return {
    onError: async (error?: AxiosError<any, any>) => {
      console.log(error?.response?.data);
      if (error?.response?.status === 401) {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        console.log(refreshToken, await AsyncStorage.getAllKeys());
        if (!!refreshToken) await refresh({ refresh_token: refreshToken });
        // if (callback) callback();
      }
    },
    isPending,
  };
};
