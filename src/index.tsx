import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "App";
import theme from "assets/theme";
import themeDark from "assets/theme-dark";
// D1 "Tema Koprusu" (docs/UI_D1_REPORT.md, Adim 2.5 + 4): CSS Custom
// Properties (landing/urun marka token'lari) + global A11y davranislari.
import "assets/css/global.css";
import { MaterialUIControllerProvider, THEME_STORAGE_KEY, useMaterialUIController } from "context";
import ForgotPassword from "layouts/authentication/forgot-password";
import Basic from "layouts/authentication/sign-in/basic";
import { ReactNode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, useLocation } from "react-router-dom";

import { LanguageProvider, useT } from "i18n";
import { DensityProvider } from "context/density";
import { NotificationsProvider } from "components/Notifications";
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
 * D1 "Tema Koprusu" (docs/UI_D1_REPORT.md, Adim 1.2-1.3): onceden burada
 * `themeDark` sabit olarak geciliyordu (Configurator'daki dark-mode switch'i
 * etkisiz kiliyordu). Artik secim `MaterialUIController` context'indeki
 * `darkMode` state'inden turetilir: `darkMode ? themeDark : theme`.
 * Bu bilesen `MaterialUIControllerProvider` ICINDE render edilmelidir.
 */
function ThemedApp({ children }: { children: ReactNode }) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  // Context'ten gelen darkMode her degistiginde (Configurator switch dahil)
  // `data-theme` / `color-scheme` DOM'da senkron tutulur. Bu, index.html'deki
  // FOUC-onleyici script ile ayni sozlesmeyi (ayni localStorage anahtari)
  // paylasir; ilk mount'ta script zaten dogru degeri yazmis olur, bu effect
  // yalnizca sonraki degisiklikleri (toggle) yansitan guvenlik agidir.
  useEffect(() => {
    const value = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", value);
    document.documentElement.style.colorScheme = value;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // localStorage erisilemez (gizli sekme/kota) — sessizce yok say.
    }
  }, [darkMode]);

  return (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

function SkipLink(): JSX.Element {
  const { t } = useT();
  return (
    <a className="tf-skip-link" href="#main-content">
      {t("common.skipToMain")}
    </a>
  );
}

function AuthGate() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { pathname } = useLocation();
  // Sira 4.3: REST snapshot SADECE burada cagrilir. LiveFleetMap icine
  // EKLEME — cift fetch / cift mount riski. MQTT canli akisi LiveFleetMap'te,
  // ilk-durum snapshot'i burada; iki ayri sorumluluk, tek cagri noktasi.
  useLatestLocations();

  const page = isAuthenticated ? (
    <App />
  ) : pathname === "/authentication/forgot-password" ? (
    <ForgotPassword />
  ) : (
    <Basic />
  );

  return (
    <>
      <SkipLink />
      {page}
    </>
  );
}

root.render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <MaterialUIControllerProvider>
        <ThemedApp>
          <LanguageProvider>
            <DensityProvider>
              <NotificationsProvider>
                <AuthGate />
              </NotificationsProvider>
            </DensityProvider>
          </LanguageProvider>
        </ThemedApp>
      </MaterialUIControllerProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
