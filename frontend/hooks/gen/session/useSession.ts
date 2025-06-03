import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import { IInitialState } from "@/reduxToolkit/Interfaces";
import { setSession } from "@/reduxToolkit/Slices";
import { ISessionData } from "./types/TSession";

export const useSession = () => {
  const dispatch = useDispatch();
  const session = useSelector((state: IInitialState) => state.session);

  const saveSession = useCallback(
    async (id: string) => {
      const newSession: ISessionData = {
        id,
        createdAt: Date.now(),
      };
      dispatch(setSession(newSession));
    },
    [dispatch]
  );

  const clear = useCallback(async () => {
    dispatch(setSession(null));
  }, [dispatch]);
  return {
    sessionId: session?.id ?? null,
    saveSession,
    clearSession: clear,
  };
};
