# LOCAL_DEV — Lokal Geliştirme Kılavuzu (eklemeler 20.06.2026)

## Hayalet Container Uyarısı (KRİTİK — saatlerce kafa karışıklığı önler)

Backend'ler Docker container'da eski kod çalıştırıp lokal değişiklikleri MASKELER.
Lokal node test öncesi container'ı durdur:

```bash
# Enterprise (lokal test için container durdur)
docker stop tulipfleet-enterprise-backend
docker ps --filter "publish=3001"   # boş olmalı, 3001 lokal node'a kalsın
```

Doğrulama: health uptime DÜŞÜK olmalı (saniyeler). Yüksekse (saat/gün) eski container cevap veriyor.
```powershell
Invoke-RestMethod http://localhost:3001/health   # uptime kontrol
```

ANA FLEET (fleet-backend): 5 hafta uptime PRODUCTION container. DURDURMA.
Köprü/kod testi STAGING'de (`/opt/fleet/backend-staging`, PM2 fleet-staging, port 3001).

## Lokal Enterprise Çalıştırma (dev:local)

3 pencere gerekli:
1. **DB tüneli** (enterprise-01 üzerinden prod DB):
   ```powershell
   ssh -L 5433:10.0.0.2:5433 root@49.12.246.212
   ```
   `root@fleet-enterprise-01` prompt'unda kalsın, kapatma.
2. **Backend** (ayrı PowerShell):
   ```powershell
   cd C:\tulipfleet-enterprise-backend
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force  # EADDRINUSE önle
   npm run dev:local
   ```
   "Database connection verified" görmeli. Görmüyorsa tünel kapalı (Test-NetConnection localhost 5433).
3. **Komutlar** (ayrı PowerShell): test, psql değil (psql sunucuda).

`.env.local` (git-ignored) gerekli:
```
DATABASE_URL=postgresql://enterprise_backend:<sifre>@localhost:5433/fleet_tracking_staging
INTERNAL_BRIDGE_TOKEN=<ana fleet ile AYNI token>
INTERNAL_CORE_API_URL=http://localhost:3010/api/internal/bridge/tasks
```

## Köprü Erişimi (lokal enterprise → prod-01 staging köprü)

Köprü prod-01 staging'de (localhost:3001, sadece içeriden, UFW/IP-allowlist).
Lokal enterprise node ondan ulaşmak için AYRI tünel (4. pencere):
```powershell
ssh -L 3010:localhost:3001 root@46.224.1.192
```
`root@fleet-prod-01` prompt'unda kalsın. Sonra:
```powershell
Invoke-RestMethod http://localhost:3010/health   # version 3.0.0 = prod-01 staging köprü (doğru)
```

DİKKAT: `localhost:3001` LOKAL enterprise'ı işaret eder (köprüyü DEĞİL).
Köprü = `localhost:3010` (tünel). INTERNAL_CORE_API_URL bunu kullanmalı.

## Pencere/Dil Disiplini

| Pencere | Dil | Komutlar |
|---------|-----|----------|
| SSH (root@...) | bash | grep, docker, psql, ls, openssl |
| PowerShell (PS C:\) | Windows | Select-String, npm, Invoke-RestMethod, Test-Path, Get-Process |

PowerShell komutu bash'e yazılınca "command not found". Tersi de geçerli.

## Token/Sır Güvenliği (DERS)

- `git remote -v` PAT'i AÇIK gösterir. Yerine: `git remote get-url origin | sed 's/ghp_[^@]*/***/'`
- `.env` grep'lerinde şifre/token maskele: `sed 's/=.*/=***/'`
- Sır sohbete düşerse: REVOKE + yenile (bekletme).
