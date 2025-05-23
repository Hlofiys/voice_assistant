import { AuthenticationApi } from "@/api";
import { useAxiosConfiguration } from "@/config/api.config/ApiConfig";

export const useAuthApi = () => {
  const configuration = useAxiosConfiguration();
  const instance = new AuthenticationApi(configuration);
  return instance;
};
