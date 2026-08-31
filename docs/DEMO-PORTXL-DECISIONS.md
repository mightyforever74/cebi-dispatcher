# DEMO-PORTXL-DECISIONS.md
**Tarih:** 29.08.2026 · **Demo:** 02.09.2026 Çarşamba, PortXL Zoom
**Statü:** KARAR-1 ✅ · KARAR-2 ✅ · KARAR-3 ✅ APPROVED (3a Seçildi)

---

## KARAR-1: Demo ortamı ✅
Prod mevcut haliyle: pp.tulipfleet.com + pi.tulipfleet.com (fleet-backend Docker :3000, leet_tracking).
- **CODE FREEZE:** 29.08 → 02.09 arası prod'a deploy YOK. 21+ commit backlog demo sonrası bakım penceresine kalır.
- Hotfix istisnası: yalnızca smoke testte demo akışını kıran hata; tek dosya, tek commit, önce staging'de kanıt.

## KARAR-2: Rotterdam seed hedefi ✅
leet_tracking_staging DB + **yeni izole demo şirket** (Dobbe Transport'a dokunulmaz).
- İçerik: 5 araç, 3 sürücü, 6 görev — Maasvlakte II → Botlek → Waalhaven, en az 1 rota Rotterdam ZE-zone geçişli.

## KARAR-3: Canlı telemetri veri yolu ✅ (Seçim: 3a)
- **3a (Kabul Edildi):** Statik seed staging'de (dispatcher detay ekranları için) + aynı Rotterdam demo şirketinin izole minimal kopyası prod'a eklenecek (veri-only, freeze ihlali değil). 
- MQTT simülatörü mqtt.tulipfleet.com:8883'e basarak canlı telemetriyi prod pipeline'a (EMQX → fleet-backend → prod DB) akıtacak ve pp.tulipfleet.com haritasında gerçek zamanlı hareket elde edilecektir.

## Sabit kurallar
- Capabilities dokümanına yalnızca 02.09'da ekranda çalışan özellikler girer (HEAD değil, prod).
- Batarya/SoC/şarj iddiası YASAK — kodda yok. Doğru başlık: ZE-zone uyumu (21 bölge/NDW), CSRD karbon, Vrachtwagenheffing.
- Backend adı: **Fastify/Node** (FastAPI değil).
- Görüşmede mevcut ürün kapsamı dışında API taahhüdü verilmez (SIRA-4).
