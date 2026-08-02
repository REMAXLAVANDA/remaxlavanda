-- Recruiting'e Lead Havuzu'ndan dönüştürülen adaylarda hangi reklamdan
-- geldiği hiç görünmüyordu — bilgi leads.reklam_adi/kampanya_kodu'nda
-- duruyordu ama dönüşüm anında recruiting_candidates'a hiç kopyalanmıyordu
-- (bkz. "hangi reklam üzerinden geldiğini göremez miyiz" isteği).
-- Denormalize ediliyor (canlı join yerine) — lead kaydı silinse/arşivlense
-- bile aday kaydında bilgi kalıcı olarak kalsın diye, aynı call_logs.
-- reklam_kodu deseni.
alter table public.recruiting_candidates add column reklam_adi text;
alter table public.recruiting_candidates add column kampanya_kodu text;
