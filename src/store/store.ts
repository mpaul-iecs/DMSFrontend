import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import authReducer from "./auth/authSlice";

// redux-persist's own "redux-persist/lib/storage/session" subpath is a CJS module
// that Vite's dev bundler doesn't always interop correctly (its `default` export
// can come through as the raw module object, so `storage.setItem` is undefined at
// runtime) — defining the sessionStorage engine directly sidesteps that entirely.
const sessionStorage = {
  getItem: (key: string) => Promise.resolve(window.sessionStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(window.sessionStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(window.sessionStorage.removeItem(key)),
};

// sessionStorage, not localStorage: the backend issues a session-scoped refresh
// cookie (no Expires/MaxAge) that is dropped when the browser closes, so the
// persisted auth flag must not outlive the browser session either.
const persistConfig = {
  key: "innereye-dms",
  storage: sessionStorage,
  whitelist: ["auth"],
};

const rootReducer = combineReducers({
  auth: authReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
