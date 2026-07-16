-- ============================================================================
-- RE/MAX Lavanda Portal — Operasyon: danışman kendine atanan çağrının
-- sonucunu kendisi girebilsin
--
-- call_logs_manage RLS'i sadece broker/owner/ofis'e güncelleme izni
-- veriyordu — danışman kendine atanan çağrıyı sadece GÖREBİLİYORDU,
-- sonucunu (Ulaşıldı/Ulaşılamadı), Portföy/Dönüş durumunu kendisi
-- işaretleyemiyordu. Bu, "danışman kendi bilgilerini girebilsin" kuralına
-- aykırıydı. Bu policy, danışmanın SADECE KENDİNE atanmış satırları
-- güncelleyebilmesine izin veriyor — with check aynı şartı tekrar ettiği
-- için bu yoldan çağrıyı başka birine devredemez/atamasını kaldıramaz.
-- ============================================================================

create policy call_logs_update_own on public.call_logs
  for update to authenticated
  using (public.is_active() and assigned_to = auth.uid())
  with check (public.is_active() and assigned_to = auth.uid());
