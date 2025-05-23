// middleware/AuthToken.ts
import { Middleware } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setToken } from "../Slices";

export const authMiddleware: Middleware = (storeAPI) => {
  let initialized = false;

  return (next) => async (action) => {
    if (!initialized) {
      initialized = true;

      try {
        const token = await AsyncStorage.getItem("accessToken");
        if (token) {
          console.log('middleWare: ', token);
          storeAPI.dispatch(setToken(token));
        }
      } catch (error) {
        console.error("Failed to load token:", error);
      }
    }

    return next(action);
  };
};
