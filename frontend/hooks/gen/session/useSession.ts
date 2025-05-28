import { useCallback } from "react";
import * as SecureStore from "expo-secure-store";
import { useDispatch, useSelector } from "react-redux";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { setSession } from "@/reduxToolkit/Slices";
import { ISessionData, SESSION_TTL_MS } from './types/TSession';

export const useSession = () => {
  const dispatch = useDispatch();
  const session = useSelector((state: IInitialState) => state.session);

  const saveSession = useCallback(
    async (id: string) => {
      const newSession: ISessionData = {
        id,
        createdAt: Date.now(),
      };
      await SecureStore.setItemAsync(
        SecureStorageKeys.SESSION_KEY,
        JSON.stringify(newSession)
      );
      dispatch(setSession(newSession));
    },
    [dispatch]
  );

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(SecureStorageKeys.SESSION_KEY);
    dispatch(setSession(null));
  }, [dispatch]);

  const isExpired = session
    ? Date.now() - session.createdAt > SESSION_TTL_MS
    : true;

  return {
    sessionId: session?.id ?? null,
    isExpired,
    saveSession,
    clearSession: clear,
  };
};
