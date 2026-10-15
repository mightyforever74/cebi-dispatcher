/**
 * TourPlanningMap — FEAT-001, Phase 1.1 (2026-10-15, Cem onayı: ADR-0014 §13
 * "ertelenmiş" kararının "Phase 1.1 / Müşteri Öncesi Aktifleştirme" olarak
 * revize edilmesi). `/optimization/tour-planning` sayfasının harita paneli.
 *
 * DÜRÜSTLÜK NOTU: `computeMatrix` hiçbir sağlayıcıda implemente değil
 * (ADR-0014 §13). Bu harita HERE'in gerçek yol geometrisini GÖSTERMEZ —
 * her görev için pickup→dropoff arası KUŞ UÇUŞU kesik çizgi çizer. Gerçek
 * sağlayıcı (ROUTING_PROVIDER=here-tour) devredeyken bile poll sonucu
 * (OptimizePollResult) yol geometrisi taşımaz, bu yüzden görsel her zaman
 * aynı dürüst "tahmini" çizim olarak kalır.
 *
 * LiveFleetMap.tsx'teki Basemap deseninden (dark/light CARTO tile + tokens)
 * BİREBİR alınmıştır; MQTT/telemetri/stale-guard gibi canlı-takip
 * karmaşıklığı YOK — bu sadece bir planlama/önizleme haritasıdır.
 */
import { Fragment, useEffect, useMemo, useRef } from "react";

import L from "leaflet";
import { MapContainer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { map as mapTokens } from "assets/theme/tokens";

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const DEFAULT_CENTER: [number, number] = [52.1326, 5.2913]; // NL (LiveFleetMap ile aynı)

export interface TourPlanningStopPoint {
  id: string;
  pickup: { lat: number; lng: number; address?: string };
  dropoff: { lat: number; lng: number; address?: string };
}

function dotIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 2px rgba(0,0,0,.5)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const PICKUP_ICON = dotIcon("#2e7d32"); // success — alınış
const DROPOFF_ICON = dotIcon("#c62828"); // error — teslim

function Basemap({ darkMode }: { darkMode: boolean }): null {
  const leafletMap = useMap();
  const layerRef = useRef<L.TileLayer | null>(null);
  const url = darkMode ? mapTokens.tiles.dark : mapTokens.tiles.light;

  useEffect(() => {
    const layer = L.tileLayer(url, { attribution: TILE_ATTRIBUTION, subdomains: "abcd", maxZoom: 20 });
    layer.addTo(leafletMap);
    layerRef.current = layer;
    return () => {
      layer.remove();
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafletMap]);

  useEffect(() => {
    layerRef.current?.setUrl(url);
  }, [url]);

  return null;
}

function FitToStops({ stops }: { stops: TourPlanningStopPoint[] }): null {
  const leafletMap = useMap();
  // Stop sayısı değişince sınırlara otur; her render'da değil (kullanıcı
  // haritayı sürüklerken sıçramasın).
  const count = stops.length;

  useEffect(() => {
    if (count === 0) return;
    const bounds = L.latLngBounds(
      stops.flatMap((s) => [
        [s.pickup.lat, s.pickup.lng] as [number, number],
        [s.dropoff.lat, s.dropoff.lng] as [number, number],
      ])
    );
    if (bounds.isValid()) {
      leafletMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, leafletMap]);

  return null;
}

export interface TourPlanningMapProps {
  stops: TourPlanningStopPoint[];
  darkMode?: boolean;
  heightPx?: number;
}

function TourPlanningMap({ stops, darkMode = false, heightPx = 360 }: TourPlanningMapProps): JSX.Element {
  const center = useMemo<[number, number]>(() => {
    if (stops.length === 0) return DEFAULT_CENTER;
    return [stops[0].pickup.lat, stops[0].pickup.lng];
  }, [stops]);

  return (
    <MapContainer
      center={center}
      zoom={8}
      style={{ height: heightPx, width: "100%", borderRadius: 8 }}
      scrollWheelZoom={false}
    >
      <Basemap darkMode={darkMode} />
      <FitToStops stops={stops} />
      {stops.map((s) => (
        <Fragment key={s.id}>
          <Marker position={[s.pickup.lat, s.pickup.lng]} icon={PICKUP_ICON} />
          <Marker position={[s.dropoff.lat, s.dropoff.lng]} icon={DROPOFF_ICON} />
          <Polyline
            positions={[
              [s.pickup.lat, s.pickup.lng],
              [s.dropoff.lat, s.dropoff.lng],
            ]}
            pathOptions={{ color: mapTokens.route, weight: 2, dashArray: "6 6" }}
          />
        </Fragment>
      ))}
    </MapContainer>
  );
}

export default TourPlanningMap;
