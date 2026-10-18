# FORK_BASELINE.md — cebi-dispatcher

Bu dosya, `cebi-dispatcher` reposunun "doğum sertifikası"dır. Fork anındaki durumu sabitler; ilerleyen fazlarda değiştirilmez, sadece altına tarihli not eklenir.

| Alan | Değer |
|---|---|
| **Proje** | TulipFleet Customer Edition — Dispatcher Panel (kapalı-devre kurumsal operasyon paneli) |
| **Fork tarihi** | 2026-10-18 |
| **Kaynak repo** | https://github.com/mightyforever74/tulipfleet-dispatcher |
| **Baseline branch** | `main` (kaynak `origin/main`) |
| **Baseline commit SHA** | `723f3a21f74d1935323b2b82ba75b73d379b0b5d` |
| **Baseline commit mesajı** | "feat(theme): dark-mode page chrome (body/sidenav/card) → landing navy ladder" |
| **Fork senaryosu** | Senaryo A — doğrudan `origin/main`'den |
| **Doğrulama** | Fork anında `git fetch origin main` ile drift kontrolü yapıldı: local HEAD ile `origin/main` birebir eşleşti. Push sonrası `git ls-remote origin main` ile aynı SHA doğrulandı. |
| **Kardeş repolar** | `cebi-backend` ← `tulipfleet-backend` @ `23bfa4e7252daac0bbc70a546384a8ccf5b275b1` · `cebi-mobile` ← `tulipfleet` @ `b51570a8e85ba57ab9425f09c6cf222ed68699fd` |
| **Merkezi ADR'ler** | `cebi-backend` reposunda, `/docs/adr/ADR-CE-01…04` |
| **Faz 1 raporu** | Proje dokümanı: `claude/tulipfleet-customer-edition-faz1-kesif-raporu.md` |

## Devralınan teknik borç (fork anında — henüz temizlenmedi)

Kaynak repoda tespit edilen, ancak şimdilik dokunulmayan temizlenmemiş teslim artefaktları birebir taşındı: `__cargoScorer.ts.tmp`, `__feat020_spec.md.tmp`, `fix-feat020-phase12.js`, `fix-roadmap.js` (kökte). Bunlar Customer Edition'ın işleyişini etkilemiyor, temizlik Faz 3/4'te planlanabilir.

## Bağımsızlık durumu

**2026-10-18 (fork anında):** `src/config/api.ts`'deki `AUTH_API_URL` / `ENTERPRISE_API_URL` / `SUPERVISOR_API_URL`, üç ayrı backend varsayımıyla ana projenin domainlerine (`api.tulipfleet.com`, `enterprise-api.tulipfleet.com`) fallback yapıyordu.

**2026-10-18 (Faz 4, commit `98d6b51`) — düzeltildi:** Üçü tek bir `CEBI_API_URL`'e konsolide edildi (ayrı enterprise servisi yok — Faz 3 kararı), ana projeye fallback kaldırıldı. `REACT_APP_CEBI_API_URL` tanımsızsa açık hata loglanır, sessizce ana projeye bağlanmaz (ADR-CE-03). Gerçek değer henüz yok — bkz. `cebi-backend/DEPLOYMENT_RUNBOOK.md` (sunucu/domain kararları açık).

## Değişiklik günlüğü

| Tarih | Not |
|---|---|
| 2026-10-18 | Fork oluşturuldu, baseline sabitlendi. |
| 2026-10-18 | Faz 4: üç-backend varsayımı tek `cebi-backend`'e konsolide edildi, ana proje fallback'leri kaldırıldı (commit `98d6b51`). |
