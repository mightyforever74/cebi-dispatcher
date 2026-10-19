# TulipFleet Customer Edition (Cebi) — cebi-dispatcher static build + serve.
#
# ADR-CE-03 "Bağımsız Çalışma Zamanı" (v2): cebi-dispatcher, Cloudflare Pages
# gibi harici bir dağıtım platformuna değil, fleet-enterprise-01'in KENDİ
# Caddy'sine servis edilecek (Cem'in 2026-10-19 kararı) — bkz.
# docs/adr/ADR-CE-03-bagimsiz-calisma-zamani.md §2 madde 7. Bu Dockerfile bu
# yüzden harici bir platform build adımı/entegrasyonu İÇERMEZ: tek başına
# `docker build` + `docker run`/compose ile, host'un kendi Caddy'si tarafından
# reverse-proxy edilen bir statik dosya sunucusu üretir.
#
# İki aşamalı build:
#   1) node — CRA (react-scripts) production build.
#   2) caddy — sadece `build/` çıktısını statik olarak sunar (SPA fallback
#      için docker/Caddyfile kullanılır). Host Caddy'si zaten TLS/Cloudflare
#      Origin Cert/gzip/header işini üstleniyor (bkz. docker-compose.cebi-
#      dispatcher.yml ve bu repoyu entegre eden FORK_BASELINE.md); bu iç
#      Caddy sadece dosya sunar, ikinci bir TLS/compress katmanı KURMAZ.

FROM node:20-alpine AS build
WORKDIR /app
# .npmrc (legacy-peer-deps=true) npm ci'DEN ÖNCE kopyalanmalı — react-scripts
# 5.0.1'in peer dependency'leri (fork-ts-checker-webpack-plugin → typescript
# ^3/^4) kök package.json'daki typescript@5.0.4 ile strict modda ERESOLVE
# veriyor; .npmrc bu projede zaten var ve tam bunun için (2026-10-19'da
# fleet-enterprise-01'deki ilk build'de bu dosya unutulup hata yakalandı).
COPY package*.json .npmrc ./
RUN npm ci
COPY . .

# REACT_APP_* değişkenleri CRA'da BUILD zamanında inline edilir (runtime'da
# değiştirilemez) — bu yüzden burada bir ARG/ENV olarak geçiriliyor, bir
# `.env` dosyası GEREKMİYOR. Değer gizli değil (herkese açık API domaini,
# zaten tarayıcı network sekmesinde görünür) — 2026-10-19 cebi-db olayında
# öğrenilen "compose'un kendi .env ikamesi sessizce boşa düşebilir" riskini
# burada tekrar üretmemek için varsayılan doğrudan burada sabitlendi.
# Farklı bir ortam (örn. staging) gerekirse `docker build --build-arg
# REACT_APP_CEBI_API_URL=...` ile override edilir.
ARG REACT_APP_CEBI_API_URL=https://cebi-api.tulipfleet.com
ENV REACT_APP_CEBI_API_URL=${REACT_APP_CEBI_API_URL}
RUN npm run build

FROM caddy:2-alpine AS serve
COPY --from=build /app/build /usr/share/caddy
COPY docker/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
