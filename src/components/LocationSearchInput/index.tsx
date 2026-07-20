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
 */
import { useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDInput from "components/MDInput";
import MDTypography from "components/MDTypography";
import { useGeocodeSearch, GeocodeResult } from "hooks/useGeocodeSearch";

export interface LocationValue {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocationSearchInputProps {
  label: string;
  value: LocationValue;
  onValueChange: (value: LocationValue) => void;
}

function LocationSearchInput({ label, value, onValueChange }: LocationSearchInputProps): JSX.Element {
  // inputText: kullanicinin YAZDIGI ham metin (arama sorgusu).
  // value.address: SECILMIS/onaylanmis adres (parent state).
  const [inputText, setInputText] = useState(value.address || "");
  const { results, loading } = useGeocodeSearch(inputText);

  return (
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
        }
      }}
      getOptionLabel={(option: string | GeocodeResult) =>
        typeof option === "string" ? option : option.addressLabel
      }
      onChange={(_event, selected: string | GeocodeResult | null) => {
        if (selected && typeof selected !== "string") {
          setInputText(selected.addressLabel);
          onValueChange({
            address: selected.addressLabel,
            latitude: selected.latitude,
            longitude: selected.longitude,
          });
        }
      }}
      renderOption={(props, option: GeocodeResult) => (
        <MDBox component="li" {...props} key={`${option.latitude}-${option.longitude}`}>
          <MDBox display="flex" flexDirection="column">
            <MDTypography variant="button" fontWeight="bold">
              {option.title}
            </MDTypography>
            <MDTypography variant="caption" color="text">
              {option.addressLabel}
            </MDTypography>
          </MDBox>
        </MDBox>
      )}
      renderInput={(params) => (
        <MDInput
          {...params}
          label={label}
          fullWidth
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
  );
}

export default LocationSearchInput;
