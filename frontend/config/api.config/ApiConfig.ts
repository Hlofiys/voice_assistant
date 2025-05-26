import { Configuration } from "@/api";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import * as SecureStorage from "expo-secure-store";
import { useSelector } from "react-redux";

export const useAxiosConfiguration = () => {
  const token = useSelector((state: IInitialState) => state.token);

  return new Configuration({
    basePath: "https://assistant.hlofiys.xyz",
    // apiKey: token || undefined,
    accessToken: token || undefined,
  });
};

import axios from "axios";
import { SecureStorageKeys } from "@/constants/SecureStorage";

export const instance = axios.create({
  // baseURL: 'https://shagai.by/api', //prod
  baseURL: "https://assistant.hlofiys.xyz/api", //develop
});

// Добавляем перехватчик запросов
instance.interceptors.request.use(
  async (config) => {
    const token = await SecureStorage.getItemAsync(
      SecureStorageKeys.ACCESS_TOKEN
    );
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
