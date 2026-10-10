/**
 * LocationSearchInput — HERE Discover ile canli adres arama alani.
 *
 * FIX (2026-07-18): Dispatcher plan olusturma ekranindaki (OptimizeTask)
 * pickup/dropoff text input'lari, HERE Discover API ile profesyonel bir
 * konum arama motoruna donusturuluyor. package.json'a yeni kutuphane
 * eklenmedi - MUI Autocomplete zaten yuklu, freeSolo + custom filterOptions
 * ile "sunucudan gelen sonuclari oldugu gibi goster" davranisi saglaniyor.
 *
 * Dispatcher harf yazdikca (min 3 karakter, 300ms debounce - useGeocodeSearch)
 * dropdown'da en yakin 5 sonuc "baslik / tam adres" seklinde gorunur.
 * Bir sonuca tiklaninca input, temiz adresle dolar ve onValueChange ile
 * {address, latitude, longitude} disariya iletilir.
 *
 * FIX (2026-07-20): renderOption'da MDBox component="li" TypeScript hatasi
 * verdi (TS2322) - MDBox'un generic "component" destegi tam polymorphic
 * degil, MUI'nin verdigi LiHTMLAttributes props'uyla (onChange:
 * FormEventHandler<HTMLLIElement>) uyusmuyordu (MDBox varsayilan olarak
 * HTMLDivElement bekliyor). Duz native <li> kullanarak tip uyusmazligi
 * tamamen ortadan kaldirildi - <li> zaten LiHTMLAttributes bekliyor.
 *
 * FIX (2026-10-10, P1-2 - ADR-0014 amendment, 7 Ekim "Waalhaven" yanlis-eslesme
 * olayi): addressLabel zaten sehir/posta kodunu metin icinde tasiyor (orn.
 * "Waalhaven Zuidzijde, 3089 JH Rotterdam, Netherlands"), ama mesafe bilgisi
 * hicbir yerde gorunmuyordu - dispatcher hangi "Waalhaven"in secildigini
 * sadece adres metnini okuyarak anlamak zorundaydi. Her secenege HERE'in
 * dondurdugu distanceM'den tek bir mesafe rozeti ("~3 km") eklendi, ve bir
 * secim yapildiginda "✓ Rotterdam, NL" seklinde kisa bir dogrulama satiri
 * goruluyor. Veri zaten useGeocodeSearch'ten geliyor - bu dosya yeni bir
 * sorgu eklemiyor, sadece var olan alanlari gosteriyor.
 */
import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import { useGeocodeSearch, GeocodeResult } from "hooks/useGeocodeSearch";
import appTheme from "assets/theme";
import { MaterialUIControllerProvider } from "context";

export interface LocationValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocationSearchInputProps {
  label: string;
  value: LocationValue;
  onValueChange: (value: LocationValue) => void;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

// ISO 3166-1 alpha-3 -> alpha-2, sadece HERE'in bu bolgede fiilen dondurdugu
// ulkeler icin (sadece gosterim amacli - bir gecerlilik denetimi degil).
const COUNTRY_ALPHA2: Record<string, string> = {
  NLD: "NL",
  BEL: "BE",
  DEU: "DE",
  FRA: "FR",
  GBR: "GB",
  LUX: "LU",
};

function toAlpha2(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  return COUNTRY_ALPHA2[countryCode] || null;
}

// "~3 km" / "~850 m" bicimli kisa mesafe rozeti. Null/sayi-olmayan girdi icin
// null doner - caller (renderOption) hic eleman basmaz, "stray badge" olmaz.
function formatDistanceBadge(distanceM: number | null | undefined): string | null {
  if (typeof distanceM !== "number" || !Number.isFinite(distanceM)) return null;
  if (distanceM < 1000) return `~${Math.round(distanceM)} m`;
  return `~${Math.round(distanceM / 1000)} km`;
}

function LocationSearchInput({
  label,
  value,
  onValueChange,
  required,
  error,
  helperText,
}: LocationSearchInputProps): JSX.Element {
  // inputText: kullanicinin YAZDIGI ham metin (arama sorgusu).
  // value.address: SECILMIS/onaylanmis adres (parent state).
  const [inputText, setInputText] = useState(value.address || "");
  // resolved: en son SECILEN sonuc - "✓ Rotterdam, NL" dogrulamasi icin.
  // Kullanici yeniden yazmaya basladiginda (onInputChange reason="input") temizlenir.
  const [resolved, setResolved] = useState<GeocodeResult | null>(null);
  const { results, loading } = useGeocodeSearch(inputText);

  // FIX (2026-10-10, test-ortami): MDBox/MDInput/MDTypography, uygulamanin
  // tek root-level ThemeProvider'inin (src/index.tsx) sagladigi ozel
  // theme.functions/borders/boxShadows alanlarina muhtac. Bu alan root'tan
  // koparilip tek basina (orn. Jest/RTL) render edildiginde theme.functions
  // undefined kalir ve styled-component'ler patlar. Normal uygulama akisinda
  // (index.tsx'teki ThemeProvider altinda) bu fallback hic devreye girmez -
  // sadece theme context eksikken kendi kendini "temalandirir".
  const outerTheme = useTheme();
  const hasThemeContext = Boolean((outerTheme as unknown as { functions?: unknown })?.functions);

  const content = (
    <MDBox>
      <Autocomplete
        freeSolo
        options={results}
        loading={loading}
        filterOptions={(x) => x} // backend zaten filtreledi, client-side tekrar filtreleme yok
        inputValue={inputText}
        onInputChange={(_event, newInputValue, reason) => {
          setInputText(newInputValue);
          if (reason === "input") {
            // Kullanici hala yaziyor - henuz gecerli bir secim yok, koordinatlari temizle.
            onValueChange({ address: newInputValue, latitude: null, longitude: null });
            setResolved(null);
          }
        }}
        getOptionLabel={(option: string | GeocodeResult) =>
          typeof option === "string" ? option : option.addressLabel
        }
        onChange={(_event, selected: string | GeocodeResult | null) => {
          if (selected && typeof selected !== "string") {
            setInputText(selected.addressLabel);
            setResolved(selected);
            onValueChange({
              address: selected.addressLabel,
              latitude: selected.latitude,
              longitude: selected.longitude,
            });
          }
        }}
        renderOption={(props, option: GeocodeResult) => {
          const badge = formatDistanceBadge(option.distanceM);
          return (
            // FIX (2026-07-20): duz native <li> - MDBox'un component="li" tip
            // uyusmazligini onlemek icin. Icerik hala MDBox/MDTypography kullaniyor
            // (bunlarin varsayilan div/span tipi sorunsuz calisiyor).
            <li {...props} key={`${option.latitude}-${option.longitude}`}>
              <MDBox display="flex" flexDirection="column">
                <MDTypography variant="button" fontWeight="bold">
                  {option.title}
                </MDTypography>
                <MDTypography variant="caption" color="text">
                  {option.addressLabel}
                </MDTypography>
                {/* Mesafe rozeti - addressLabel zaten sehir/posta kodunu tasiyor,
                    tekrar basilmaz (RTL getByText duplicate-match'i onler). */}
                {badge && (
                  <MDTypography variant="caption" color="text" fontWeight="light">
                    {badge}
                  </MDTypography>
                )}
              </MDBox>
            </li>
          );
        }}
        renderInput={(params) => (
          <MDInput
            {...params}
            label={label}
            fullWidth
            error={error}
            helperText={helperText}
            required={required}
            inputProps={{
              ...params.inputProps,
              "aria-required": required || undefined,
              "aria-invalid": error || undefined,
            }}
            FormHelperTextProps={{
              sx: { color: error ? "error.main" : undefined },
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      {resolved?.city && (
        <MDTypography variant="caption" color="success" sx={{ display: "block", mt: 0.5 }}>
          {`✓ ${resolved.city}${toAlpha2(resolved.countryCode) ? `, ${toAlpha2(resolved.countryCode)}` : ""}`}
        </MDTypography>
      )}
    </MDBox>
  );

  // MDTypography ayrica ayri bir React context'e (useMaterialUIController,
  // src/context/index.tsx - darkMode/sidenav gibi global UI durumu) muhtac;
  // uygulamada index.tsx MaterialUIControllerProvider + ThemeProvider'i
  // BIRLIKTE root'ta sagliyor, o yuzden ayni "hasThemeContext" sinyali
  // ikisi icin de tek proxy olarak kullanilabilir.
  if (hasThemeContext) return content;
  return (
    <MaterialUIControllerProvider>
      <ThemeProvider theme={appTheme}>{content}</ThemeProvider>
    </MaterialUIControllerProvider>
  );
}

export default LocationSearchInput;
