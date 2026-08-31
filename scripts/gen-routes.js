// gen-routes.js — 5 demo rotasini OSRM'den gercek yol geometrisiyle uretir
// Kullanim (sunucuda): node gen-routes.js   -> routes.json yazar
const fs = require("fs");
const PAIRS = [
  { id:"a1b2c3d40001", from:[51.9536,4.0555], to:[51.8850,4.2870] }, // ECT -> Botlek
  { id:"a1b2c3d40002", from:[51.8880,4.4350], to:[51.9575,4.0958] }, // Waalhaven -> Euromax
  { id:"a1b2c3d40003", from:[51.8850,4.2870], to:[51.8865,4.3830] }, // Botlek -> Pernis
  { id:"a1b2c3d40004", from:[51.8880,4.4350], to:[51.9225,4.4792] }, // ZE Centrum
  { id:"a1b2c3d40005", from:[51.8880,4.4350], to:[51.9260,4.5120] }, // ZE Kralingen
];
(async () => {
  const out = {};
  for (const p of PAIRS) {
    const url = `https://router.project-osrm.org/route/v1/driving/${p.from[1]},${p.from[0]};${p.to[1]},${p.to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) { console.error(p.id, "OSRM HTTP", res.status); process.exit(1); }
    const j = await res.json();
    if (!j.routes || !j.routes[0]) { console.error(p.id, "rota yok:", JSON.stringify(j).slice(0,120)); process.exit(1); }
    // GeoJSON [lon,lat] -> sim [lat,lon]
    out[p.id] = j.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
    console.log(p.id, "->", out[p.id].length, "nokta,", Math.round(j.routes[0].distance/100)/10, "km");
    await new Promise(r => setTimeout(r, 1200)); // public sunucuya nazik davran
  }
  fs.writeFileSync("routes.json", JSON.stringify(out));
  console.log("routes.json yazildi");
})();
