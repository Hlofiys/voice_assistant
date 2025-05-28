// middleware/sessionMiddleware.ts
import { Middleware } from "@reduxjs/toolkit";
import * as SecureStore from "expo-secure-store";
import { setSession } from "../Slices";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import { ISessionData, SESSION_TTL_MS } from "@/hooks/gen/session/useSession";

let sessionInitialized = false;

export const sessionMiddleware: Middleware = (storeAPI) => {
  // асинхронная инициализация сессии запускается один раз
  if (!sessionInitialized) {
    sessionInitialized = true;

    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(
          SecureStorageKeys.SESSION_KEY
        );

        if (!stored) return;

        const session: ISessionData = JSON.parse(stored);
        const isExpired = Date.now() - session.createdAt > SESSION_TTL_MS;

        if (isExpired) {
          await SecureStore.deleteItemAsync(SecureStorageKeys.SESSION_KEY);
          return;
        }

        storeAPI.dispatch(setSession(session));
        console.log("✅ session restored:", session);
      } catch (error) {
        console.warn("Ошибка загрузки сессии:", error);
      }
    })();
  }

  return (next) => (action) => {
    return next(action); // теперь строго синхронно
  };
};
