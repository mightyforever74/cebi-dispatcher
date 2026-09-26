# UI D7-2 — CLS ve layout (başlık/gövde, skeleton, sidenav, logo)

Dal: `ui-d7-2-layout` · Taban: main `e00bc01` / prod referans `3aebb4b` · Tarih: 2026-09-26

## Neden

Prod 3aebb4b, 1045 px, TR (D7-1 raporu, D7-1'den bağımsız):

| Kusur | Önce |
|---|---|
| DataTable başlık / gövde | Tasks 730 / 934, Drivers 650 / 949; sütun `left` tutmuyordu |
| DataState ilk yükleme | Drivers/Exceptions ~200 ms "yok" boş-durumu; veri 370–550 ms |
| Sidenav | Paper 235 px, içerik 251 px → overflow-x scrollbar (TR "Akıllı Rota Optimizas…") |
| Logo | `tulipfleet-logo.png` `width`/`height` yok → Exceptions CLS 0.168 katkısı |

Kök: MD2 `MuiTableHead { display: block }` thead'i tablo düzeninden koparıyordu; `placeholderData: []` `listFetchState` içinde boş sayılıyordu; sidenav öğesi `width: 100%` + yatay margin taşıyordu.

## Değişiklik

| Dosya | Ne |
|---|---|
| `src/assets/theme{,-dark}/components/table/tableHead.ts` | `display: table-header-group`, `padding: 0` |
| `src/components/DataTable/index.tsx` | `table-layout: fixed`, `colgroup`, thead/tbody table-* ; skeleton 5 satır `rowPx`, `aria-busy` |
| `src/examples/Tables/DataTable/**` | Aynı `<table>`, `TableHead`, fixed layout, hücre taşması ellipsis |
| `src/components/DataState.tsx` | `listFetchState`: boş yalnız `isSuccess && !isPlaceholderData && length===0` |
| `src/layouts/dispatcher/{tasks,drivers,vehicles,exceptions}` | `isPending`/`isSuccess`/`isPlaceholderData`; `loading={status==="loading"}` |
| `src/examples/Sidenav/{SidenavRoot,index,styles/*}` | öğe `calc(100% - 16px)` + ellipsis + `title`; Paper `overflow-x: hidden` (kanıtlı) |
| `BrandBlock` + Sidenav logo | intrinsic `width=178 height=240` (PNG 178×240). Landing'de SVG/WebP yok |

Yoğunluk 40/56 ve D4 taşma (ellipsis + `title`) korundu. Yeni npm yok. Hex yok (`tokens.ts` dışı).

## Kanıt — tablo genişlik (1045 px, TR)

Komut (her liste sayfasında):

```js
const table = document.querySelector("table");
const thead = table.querySelector("thead");
const tbody = table.querySelector("tbody");
const ths = [...thead.querySelectorAll("th")];
const tds = [...tbody.querySelector("tr").querySelectorAll("td")];
({
  theadW: thead.getBoundingClientRect().width,
  tbodyW: tbody.getBoundingClientRect().width,
  cols: [0, 1, 2].map((i) => ({
    thLeft: ths[i].getBoundingClientRect().left,
    tdLeft: tds[i].getBoundingClientRect().left,
  })),
});
```

| Sayfa | Önce thead / tbody | Sonra thead / tbody | Δ | col0/1/2 `left` |
|---|---|---|---|---|
| Tasks | 730 / 934 | **934.29 / 934.29** | **0** | 48 = 48; 227.17 = 227.17; 380.75 = 380.75 |
| Drivers | 650 / 949 | **949.14 / 949.14** | **0** | 48 = 48; 281.63 = 281.63; 486.06 = 486.06 |
| Exceptions | (aynı kusur) | **982.29 / 982.29** | **0** | 24 = 24; 188.88 = 188.88; 301.95 = 301.95 |

`getComputedStyle(thead).display === "table-header-group"`; `table-layout: fixed`.

## Kanıt — skeleton / boş-durum

`listFetchState` boş-durumu `isSuccess === true` olmadan açmaz. `placeholderData: []` (`useDrivers` / `useTasks` / `useVehicles`) skeleton.

3 sıfırdan geçiş (client click, 16 ms poll, 900 ms, TR metin `/Sürücü yok|Görev yok|İstisna yok/`):

```
drivers ← exceptions  hits=[]  count=0
exceptions ← drivers  hits=[]  count=0
drivers ← exceptions  hits=[]  count=0
```

İlk tam yükleme snapshot'larında da "yok" 0; tablo başlığı + satırlar.

## Kanıt — sidenav

```js
const paper = document.querySelector(".MuiDrawer-paper");
({ clientWidth: paper.clientWidth, scrollWidth: paper.scrollWidth, overflowX: getComputedStyle(paper).overflowX });
```

```
clientWidth: 250
scrollWidth: 250
overflowX: "hidden"
contentFits: true   // scrollWidth ≤ clientWidth
```

Mini (kapalı) ikon kutusu 32×32 aynı; metin `maxWidth: 0` / `opacity: 0` korundu.

## Kanıt — logo

```
img[src*=tulipfleet-logo] → width="178" height="240" (natural 178×240)
login display 36×48; sidenav CSS width 2rem, height auto
```

## Doğrulama

- `npx tsc --noEmit` exit 0
- `npm run i18n:gate` exit 0 (çıktı boş)
- `npm run verify:i18n` ok — 599 keys
- `npm run build` temiz; gzip **535.44 kB** `main.910200f1.js`, CSS 10.2 kB `main.b745e5c9.css`

axe-core 4.10.3, WCAG 2.1 A/AA, localhost:3000, TR:

| Ekran | light crit/ser | dark crit/ser |
|---|---|---|
| Login | 0 / 0 | 0 / 0 |
| Tasks | 0 / 0 | 0 / 0 |
| Drivers | 0 / 0 | 0 / 0 |
| Exceptions | 0 / 0 | 0 / 0 |

390 px Tasks (kart düzeni, TR): `docs/screenshots/d7-2/tasks-tr-light-390.jpg` (JPEG q80, 43 KB).

Lighthouse'u Cem koşar (bu turda paketlenmedi).

## Kapsam dışı

- İkon fontu pyftsubset (D7-1 notu)
- 1045 sidebar + banner örtüşmesi (D7 eski not)
- Preview CNAME çevirisi Cem; CORS aynı
- `scripts/sim-portxl.js`, `docs/UI_D0_DISCOVERY.md` commit edilmedi

## git

`git status --short` teslim anında yalnız bu paketin dosyaları (sim-portxl / UI_D0 hariç).
