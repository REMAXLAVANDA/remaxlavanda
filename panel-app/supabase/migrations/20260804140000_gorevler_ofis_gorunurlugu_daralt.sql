-- ============================================================================
-- Görevler: ofis artık herkesin görevini görmez — sadece kendi oluşturduğu
-- veya kendisine atanan görevleri görür (danışmanla aynı kural). broker ve
-- owner değişmedi, hâlâ TÜM görevleri görür.
-- ============================================================================
-- Broker: "danışman veya ofis kendi oluşturdukları hariç görevleri
-- göremesin ... owner ofisi ve brokeri de görsün ... broker hepsini
-- görsün" — netleştirme sonrası: owner zaten "hepsini görür" grubunda
-- kalıyor (is_manager() = broker+owner), sadece ofis o gruptan çıkarılıp
-- danışmanla aynı satır bazlı kurala tabi oluyor. tasks_insert/update/delete
-- politikaları BİLEREK dokunulmadı — bu sadece GÖRME (select) kuralı,
-- ofisin görev oluşturma/yönetme yetkisi aynı kalıyor.

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.is_active() and (assignee_id = auth.uid() or created_by = auth.uid() or public.is_manager()));
