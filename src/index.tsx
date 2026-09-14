import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "App";
import themeDark from "assets/theme-dark";
import { MaterialUIControllerProvider } from "context";
import ForgotPassword from "layouts/authentication/forgot-password";
import Basic from "layouts/authentication/sign-in/basic";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";

import { LanguageProvider } from "i18n";
import { useLatestLocations } from "hooks/useLatestLocations";
import { useAuthStore } from "store/useAuthStore";

// Query client for react-query; kept minimal and passed into the provider below.
const queryClient = new QueryClient();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found. Check public/index.html");
}

const root = createRoot(container);

function AuthGate() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pathname } = useLocation();
  // Sıra 4.3: REST snapshot SADECE burada çağrılır. LiveFleetMap içine
  // EKLEME — çift fetch / çift mount riski. MQTT canlı akışı LiveFleetMap'te,
  // ilk-durum snapshot'ı burada; iki ayrı sorumluluk, tek çağrı noktası.
  useLatestLocations();

  if (isAuthenticated) {
    return <App />;
  }

  // Unauthenticated users never reach App Routes — forgot-password must
  // render here or the trial welcome-mail link has nowhere to land.
  if (pathname === "/authentication/forgot-password") {
    return <ForgotPassword />;
  }

  return <Basic />;
}

root.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider theme={themeDark}>
        <CssBaseline />
        <MaterialUIControllerProvider>
          <LanguageProvider>
            <AuthGate />
          </LanguageProvider>
        </MaterialUIControllerProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
