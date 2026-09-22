import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "App";
import theme from "assets/theme";
import themeDark from "assets/theme-dark";
import { MaterialUIControllerProvider, THEME_STORAGE_KEY, useMaterialUIController } from "context";
import ForgotPassword from "layouts/authentication/forgot-password";
import Basic from "layouts/authentication/sign-in/basic";
import { ReactNode, useEffect } from "react";
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

/**
 * D1 "Tema Köprüsü" (docs/UI_D1_REPORT.md, Adım 1.2-1.3): önceden burada
 * `themeDark` sabit olarak geçiliyordu (Configurator'daki dark-mode switch'i
 * etkisiz kılıyordu). Artık seçim `MaterialUIController` context'indeki
 * `darkMode` state'inden türetilir: `darkMode ? themeDark : theme`.
 * Bu bileşen `MaterialUIControllerProvider` İÇİNDE render edilmelidir.
 */
function ThemedApp({ children }: { children: ReactNode }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  // Context'ten gelen darkMode her değiştiğinde (Configurator switch dahil)
  // `data-theme` / `color-scheme` DOM'da senkron tutulur. Bu, index.html'deki
  // FOUC-önleyici script ile aynı sözleşmeyi (aynı localStorage anahtarı)
  // paylaşır; ilk mount'ta script zaten doğru değeri yazmış olur, bu effect
  // yalnızca sonraki değişiklikleri (toggle) yansıtan güvenlik ağıdır.
  useEffect(() => {
    const value = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
    document.documentElement.style.colorScheme = value;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // localStorage erişilemez (gizli sekme/kota) — sessizce yok say.
    }
  }, [darkMode]);

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

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
      <MaterialUIControllerProvider>
        <ThemedApp>
          <LanguageProvider>
            <AuthGate />
          </LanguageProvider>
        </ThemedApp>
      </MaterialUIControllerProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
