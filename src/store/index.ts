import { configureStore } from "@reduxjs/toolkit";
import messageReducer from "./slices/messageSlice";
import chatLogReducer from "./slices/chatLogSlice";

export const store = configureStore({
  reducer: {
    message: messageReducer,
    chatLog: chatLogReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
