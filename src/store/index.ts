import { configureStore } from "@reduxjs/toolkit";
import chatLogReducer from "./slices/chatLogSlice";
import messageReducer from "./slices/messageSlice";

export const store = configureStore({
  reducer: {
    chatLog: chatLogReducer,
    message: messageReducer,
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
