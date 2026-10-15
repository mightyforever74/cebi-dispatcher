/**
 * TourPlanningMap — FEAT-001, Phase 1.1 (2026-10-15, Cem onayı: ADR-0014 §13
 * "ertelenmiş" kararının "Phase 1.1 / Müşteri Öncesi Aktifleştirme" olarak
 * revize edilmesi). `/optimization/tour-planning` sayfasının harita paneli.
 *
 * REVİZYON (2026-10-15, aynı gün ikinci tur, Cem kararı): pickup→dropoff
 * arası düz kesik çizgi KALDIRILDI. Gerekçe (Cem'in UX tartışması): "cetvelle
 * çekilmiş çizgi" operatörün ürüne güvenini kırıyordu; teknik olarak doğru
 * (kuş uçuşu olduğunu zaten açıkça söylüyorduk) ama insan algısında "bozuk
 * rota" izlenimi yaratıyordu. ADR-0014 §13'ün kendisi (computeMatrix/gerçek
 * yol geometrisi Phase 2/müşteri bütçeli — maliyet + mimari disiplin
 * gerekçesiyle) DEĞİŞMEDİ, bilinçli olarak yeniden ERTELENDİ (bkz.
 * TourPlanning.tsx başlık yorumu, "Kısa Vadeli Çözüm" kararı). Çözüm:
 * çizgisiz, numaralı duraklar — "navigasyon simülatörü değil, operasyonel
 * durak optimizasyon özeti" mesajı net.
 *
 * DÜRÜSTLÜK NOTU (güncellendi): harita artık hiçbir yol/bağlantı çizgisi
 * göstermiyor (ne kuş uçuşu ne gerçek) — yalnızca ziyaret SIRASINA göre
 * numaralanmış duraklar. Gerçek sağlayıcı (HERE Tour Planning) devredeyken
 * numaralar `here_raw_solution.tours[].stops[]`'un GERÇEK optimize edilmiş
 * ziyaret sırasını yansıtır; Mock'ta (ya da ham çözüm yoksa) numaralar yalnız
 * durakların form'a girilme sırasını yansıtır — bu ayrım ETA tablosunda
 * (TourPlanning.tsx) ayrıca açıkça belirtiliyor.
 *
 * LiveFleetMap.tsx'teki Basemap deseninden (dark/light CARTO tile + tokens)
 * BİREBİR alınmıştır; MQTT/telemetri/stale-guard gibi canlı-takip
 * karmaşıklığı YOK — bu sadece bir planlama/önizleme haritasıdır.
 */
import { useEffect, useMemo, useRef } from "react";

import L from "leaflet";
import { MapContainer, Marker, useMap } from "react-leaflet";
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

/**
 * Haritada (ve ETA tablosunda) tek bir numaralı durak. `tourIndex` birden
 * fazla araç/tour varsa her birini ayrı renk/grupla ayırt etmek için.
 */
export interface MapRouteStop {
  tourIndex: number;
  order: number; // 1'den başlar, kendi tour'u İÇİNDE ziyaret sırası
  lat: number;
  lng: number;
  kind: "pickup" | "dropoff" | "depot";
}

// Araç başına sabit, birbirinden ayırt edilebilir renk paleti (çok-araçlı
// plan nadir ama mümkün — tasarım sistemi tonlarından, keyfi hex değil).
const TOUR_COLORS = ["#2e7d32", "#1565c0", "#c62828", "#ef6c00", "#6a1b9a", "#00838f"];

function tourColor(tourIndex: number): string {
  return TOUR_COLORS[tourIndex % TOUR_COLORS.length];
}

function numberedIcon(order: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);color:#fff;font:700 12px/1 Manrope,sans-serif">${order}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

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

function FitToStops({ points }: { points: MapRouteStop[] }): null {
  const leafletMap = useMap();
  const count = points.length;

  useEffect(() => {
    if (count === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    if (bounds.isValid()) {
      leafletMap.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, leafletMap]);

  return null;
}

/** `stops` (task bazlı pickup/dropoff) -> tek "tour" varmış gibi, form sırasıyla numaralanmış MapRouteStop[]. */
function flattenTaskStops(stops: TourPlanningStopPoint[]): MapRouteStop[] {
  const points: MapRouteStop[] = [];
  let order = 0;
  for (const s of stops) {
    order += 1;
    points.push({ tourIndex: 0, order, lat: s.pickup.lat, lng: s.pickup.lng, kind: "pickup" });
    order += 1;
    points.push({ tourIndex: 0, order, lat: s.dropoff.lat, lng: s.dropoff.lng, kind: "dropoff" });
  }
  return points;
}

export interface TourPlanningMapProps {
  stops: TourPlanningStopPoint[];
  /** HERE'in gerçek ziyaret sırası (bkz. TourPlanning.tsx'teki hesaplama). Verilmezse `stops`'tan türetilir. */
  routeStops?: MapRouteStop[];
  darkMode?: boolean;
  heightPx?: number;
}

function TourPlanningMap({ stops, routeStops, darkMode = false, heightPx = 360 }: TourPlanningMapProps): JSX.Element {
  const points = useMemo<MapRouteStop[]>(
    () => (routeStops && routeStops.length > 0 ? routeStops : flattenTaskStops(stops)),
    [routeStops, stops]
  );

  const center = useMemo<[number, number]>(() => {
    if (points.length === 0) return DEFAULT_CENTER;
    return [points[0].lat, points[0].lng];
  }, [points]);

  return (
    <MapContainer
      center={center}
      zoom={8}
      style={{ height: heightPx, width: "100%", borderRadius: 8 }}
      scrollWheelZoom={false}
    >
      <Basemap darkMode={darkMode} />
      <FitToStops points={points} />
      {points.map((p) => (
        <Marker
          key={`${p.tourIndex}-${p.order}-${p.kind}`}
          position={[p.lat, p.lng]}
          icon={numberedIcon(p.order, tourColor(p.tourIndex))}
        />
      ))}
    </MapContainer>
  );
}

export default TourPlanningMap;
