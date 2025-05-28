import * as SecureStorage from "expo-secure-store";
import axios from "axios";
import { SecureStorageKeys } from "@/constants/SecureStorage";

export const instance = axios.create({
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
