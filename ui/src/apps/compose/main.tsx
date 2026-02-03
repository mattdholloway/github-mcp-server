import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "../../components/AppProvider";
import { ComposeApp } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProvider>
      <ComposeApp />
    </AppProvider>
  </StrictMode>
);
