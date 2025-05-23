// Slices.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IInitialState } from "./Interfaces";

export const initialState: IInitialState = {
  token: null,
};

export const loadToken = createAsyncThunk("auth/loadToken", async () => {
  const token = await AsyncStorage.getItem("accessToken");
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
