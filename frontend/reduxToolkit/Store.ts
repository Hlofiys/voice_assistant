// store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { authSliceReduce, sessionSliceReduce } from "./Slices";
import { authMiddleware } from "./middleware/AuthMiddleware";
import { sessionMiddleware } from "./middleware/SessionMiddleware";

const store = configureStore({
  reducer: {
    token: authSliceReduce,
    session: sessionSliceReduce,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authMiddleware, sessionMiddleware),
});

store.dispatch({ type: "auth/loadToken" });
store.dispatch({ type: "chat/session" });

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
