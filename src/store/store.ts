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
  type PersistConfig,
} from "redux-persist";
import authReducer from "./auth/authSlice";
import menuReducer from "./menu/menuSlice";
import notificationReducer from "./notification/notificationSlice";

// redux-persist's own "redux-persist/lib/storage/session" subpath is a CJS module
// that Vite's dev bundler doesn't always interop correctly (its `default` export
// can come through as the raw module object, so `storage.setItem` is undefined at
// runtime) — defining the sessionStorage engine directly sidesteps that entirely.
const sessionStorage = {
  getItem: (key: string) => Promise.resolve(window.sessionStorage.getItem(key)),
  setItem: (key: string, value: string) => Promise.resolve(window.sessionStorage.setItem(key, value)),
  removeItem: (key: string) => Promise.resolve(window.sessionStorage.removeItem(key)),
};

const rootReducer = combineReducers({
  auth: authReducer,
  menu: menuReducer,
  notification: notificationReducer,
});

type RootReducerState = ReturnType<typeof rootReducer>;

// sessionStorage, not localStorage: the backend issues a session-scoped refresh
// cookie (no Expires/MaxAge) that is dropped when the browser closes, so the
// persisted auth flag must not outlive the browser session either.
//
// Explicitly typed as PersistConfig<RootReducerState> — without this, persistReducer's
// generic can't be inferred from our hand-rolled `sessionStorage` object (it doesn't
// structurally match redux-persist's own Storage type closely enough) and silently falls
// back to `{}`, making every `state.auth` / `state.menu` access error with "Property
// '...' does not exist on type 'PersistPartial'" everywhere useAppSelector is used.
const persistConfig: PersistConfig<RootReducerState> = {
  key: "innereye-dms",
  storage: sessionStorage,
  whitelist: ["auth"],
};

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
