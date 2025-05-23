import { Configuration } from "@/api";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { useSelector } from "react-redux";

export const useAxiosConfiguration = () => {
  const token = useSelector((state: IInitialState) => state.token);

  return new Configuration({
    basePath: "https://assistant.hlofiys.xyz",
    accessToken: token || undefined,
  });
};
