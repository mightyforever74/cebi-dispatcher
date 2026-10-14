/**
=========================================================
* TulipFleet Dispatcher — Auth BrandBlock
=========================================================
* D2 "Kabuk" (docs/UI_D2_REPORT.md, Adım 4): login/forgot-password kart
* başlığı. Logo `public/tulipfleet-logo.webp` (+ PNG fallback) + display-font
* wordmark + sözlükten tagline. MD2 "info" gradient başlığı yok.
*
* D7-3 (1) (15 Eki 2026): orijinal PNG 178x240, 42 KiB idi ama burada yalnızca
* 48px yükseklikte gösteriliyor — Lighthouse "Improve image delivery" /
* "properly size images" bulgusu. Master asset 107x144'e (3x retina
* headroom, 48px CSS yüksekliğin üstü) küçültüldü + WebP üretildi (2.4 KiB,
* ~%94 küçülme); eski/webp desteklemeyen tarayıcılar için <picture> ile PNG
* fallback (17 KiB) korunuyor.
*/

import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import { useT } from "i18n";

function BrandBlock(): JSX.Element {
  const { t } = useT();
  const publicUrl = process.env.PUBLIC_URL || "";

  return (
    <MDBox textAlign="center" pt={3} pb={0.5} px={3}>
      <picture>
        <source srcSet={`${publicUrl}/tulipfleet-logo.webp`} type="image/webp" />
        <img
          src={`${publicUrl}/tulipfleet-logo.png`}
          alt=""
          width={107}
          height={144}
          decoding="async"
          style={{ height: 48, width: "auto", marginBottom: 12, display: "inline-block" }}
        />
      </picture>
      <MDTypography
        variant="h4"
        component="h1"
        fontWeight="medium"
        sx={(theme: { typography: { h1: { fontFamily: string } } }) => ({
          fontFamily: theme.typography.h1.fontFamily,
        })}
      >
        {t("login.brand")}
      </MDTypography>
      <MDTypography variant="button" color="text" display="block" mt={0.5}>
        {t("login.tagline")}
      </MDTypography>
    </MDBox>
  );
}

export default BrandBlock;
