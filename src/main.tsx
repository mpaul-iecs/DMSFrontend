import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
// Only the four weights the app actually uses — importing the whole
// @fontsource/ibm-plex-sans package would pull in every weight's .woff2 unnecessarily.
// Note: IBM Plex Sans has no 800/ExtraBold weight (it only ships 100/200/300/400/500/
// 600/700) — 700/Bold is the heaviest available, used here in place of 800.
import "@fontsource/ibm-plex-sans/200.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "./index.css";
import "./i18n";
import App from "./App.tsx";
import { store, persistor } from "./store/store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </StrictMode>,
);
