// middleware/AuthToken.ts
import { Middleware } from "@reduxjs/toolkit";
import * as SecureStorage from "expo-secure-store";
import { setToken } from "../Slices";
import { SecureStorageKeys } from "@/constants/SecureStorage";

export const authMiddleware: Middleware = (storeAPI) => {
  let initialized = false;

  return (next) => async (action) => {
    if (!initialized) {
      initialized = true;

      try {
        const token = await SecureStorage.getItemAsync(
          SecureStorageKeys.ACCESS_TOKEN
        );
        if (token) {
          console.log("middleWare: ", token);
          storeAPI.dispatch(setToken(token));
        }
      } catch (error) {
        console.error("Failed to load token:", error);
      }
    }

    return next(action);
  };
};
