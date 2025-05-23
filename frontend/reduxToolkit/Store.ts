// store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { authSliceReduce } from "./Slices";
import { authMiddleware } from "./middleware/AuthMiddleware";

const store = configureStore({
  reducer: {
    token: authSliceReduce,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware),
});

store.dispatch({ type: "auth/loadToken" });

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
