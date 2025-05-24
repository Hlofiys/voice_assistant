// Slices.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as SecureStorage from "expo-secure-store";
import { IInitialState } from "./Interfaces";
import { SecureStorageKeys } from '@/constants/SecureStorage';

export const initialState: IInitialState = {
  token: null,
};

export const loadToken = createAsyncThunk("auth/loadToken", async () => {
  const token = await SecureStorage.getItemAsync(SecureStorageKeys.ACCESS_TOKEN);
  return token;
});

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

export const { setToken, clearToken } = authTokenSlice.actions;
export const authSliceReduce = authTokenSlice.reducer;
