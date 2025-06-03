// Slices.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStorage from "expo-secure-store";
import { IInitialState } from "./Interfaces";
import { SecureStorageKeys } from "@/constants/SecureStorage";
import {
  ISessionData,
  SESSION_TTL_MS,
} from "@/hooks/gen/session/types/TSession";

export const initialState: IInitialState = {
  token: null,
  session: null,
};

export const loadToken = createAsyncThunk("auth/loadToken", async () => {
  const token = await SecureStorage.getItemAsync(
    SecureStorageKeys.ACCESS_TOKEN
  );
  return token;
});

// export const loadSession = createAsyncThunk("chat/session", async () => {
//   try {
//     const stored = await SecureStorage.getItemAsync(
//       SecureStorageKeys.SESSION_KEY
//     );

//     if (!stored) return null;

//     const session: ISessionData = JSON.parse(stored);

//     const isExpired = Date.now() - session.createdAt > SESSION_TTL_MS;

//     if (isExpired) {
//       await SecureStorage.deleteItemAsync(SecureStorageKeys.SESSION_KEY);
//       return null;
//     }

//     return session;
//   } catch (error) {
//     console.warn("Ошибка загрузки сессии:", error);
//     return null;
//   }
// });

const authTokenSlice = createSlice({
  name: "token",
  initialState: initialState.token,
  reducers: {
    setToken: (state, action: PayloadAction<string | null>) => {
      return (state = action.payload);
    },
    clearToken: (state) => {
      return (state = null);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadToken.fulfilled, (state, action) => {
      return (state = action.payload ?? null);
    });
  },
});

const sessionSlice = createSlice({
  name: "session",
  initialState: initialState.session,
  reducers: {
    setSession: (state, action: PayloadAction<ISessionData | null>) => {
      return (state = action.payload);
    },
  },
});

export const { setToken, clearToken } = authTokenSlice.actions;
export const { setSession } = sessionSlice.actions;

export const authSliceReduce = authTokenSlice.reducer;
export const sessionSliceReduce = sessionSlice.reducer;
