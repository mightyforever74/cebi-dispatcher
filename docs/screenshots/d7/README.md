# D7 screenshot matrix

JPEG q80, hedef ≤150 KB. Ad: `{screen}-{lang}-{theme}-{width}.jpg`.

## Bu turda üretilen

| Dosya | Not |
|---|---|
| `login-nl-dark-1280.jpg` | varsayılan NL |
| `login-en-dark-1280.jpg` | `tf-lang=en` |
| `login-tr-dark-1280.jpg` | `tf-lang=tr` |
| `login-tr-dark-390.jpg` | 390 emülasyon (panel genişliği tam kırpılmayabilir) |
| `login-en-light-1280.jpg` | `tf.theme=light` — hero navy kalır, sayfa offwhite |
| `login-en-light-390.jpg` | aynı, 390 |

## Üretilmeyen (96 − 6)

`map` / `tasks` / `drivers` / `vehicles` / `exceptions` / `optimize` / `settings` × 3 dil × 2 tema × 2 genişlik.

Sebep: `dispatcher-auth` `expiresAt=2026-09-22T14:01:48Z` (süresi dolmuş). Login AuthGate dışında; diğer 7 ekran App içinde.

Cem: oturum açıp aynı CNAME’de kalan hücreleri doldurur.
