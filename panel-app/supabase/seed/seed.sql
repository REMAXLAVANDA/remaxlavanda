-- ============================================================================
-- RE/MAX Lavanda Portal — Dev seed verisi
--
-- SADECE lokal/dev ortamda çalıştırın. auth.users içine doğrudan satır
-- ekliyor (dev şifresi: "lavanda123") — production'da KULLANMAYIN, gerçek
-- kullanıcılar Supabase Auth (davet/kayıt) üzerinden oluşturulmalı.
-- ============================================================================

do $$
declare
  v_broker uuid := '00000000-0000-0000-0000-000000000001';
  v_owner uuid := '00000000-0000-0000-0000-000000000002';
  v_ofis uuid := '00000000-0000-0000-0000-000000000003';
  v_danisman uuid := '00000000-0000-0000-0000-000000000004';
  v_danisman2 uuid := '00000000-0000-0000-0000-000000000005';
  v_cat_konut uuid;
  v_cat_ticari uuid;
  v_cat_arsa uuid;
  v_cat_diger uuid;
  v_cat_docs_sozlesme uuid;
  v_cat_docs_iban uuid;
  v_period uuid;
begin

  -- ---- auth.users (dev-only) -------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    ('00000000-0000-0000-0000-000000000000', v_broker, 'authenticated', 'authenticated', 'broker@lavanda.dev', crypt('lavanda123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_owner, 'authenticated', 'authenticated', 'owner@lavanda.dev', crypt('lavanda123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_ofis, 'authenticated', 'authenticated', 'ofis@lavanda.dev', crypt('lavanda123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_danisman, 'authenticated', 'authenticated', 'danisman1@lavanda.dev', crypt('lavanda123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_danisman2, 'authenticated', 'authenticated', 'danisman2@lavanda.dev', crypt('lavanda123', gen_salt('bf')), now(), now(), now(), '', '', '', '')
  on conflict (id) do nothing;

  -- ---- public.users -------------------------------------------------------
  insert into public.users (id, ad, email, rol, baslangic_tarihi) values
    (v_broker, 'Ahmet Erdemir', 'broker@lavanda.dev', 'broker', '2020-01-01'),
    (v_owner, 'Ofis Sahibi (Owner)', 'owner@lavanda.dev', 'owner', '2021-03-15'),
    (v_ofis, 'Ofis Personeli', 'ofis@lavanda.dev', 'ofis', '2022-06-01'),
    (v_danisman, 'Ali Yılmaz', 'danisman1@lavanda.dev', 'danisman', '2023-02-10'),
    (v_danisman2, 'Zeynep Kaya', 'danisman2@lavanda.dev', 'danisman', '2024-05-20')
  on conflict (id) do nothing;

  -- ---- categories -----------------------------------------------------------
  insert into public.categories (module, key, label, sort_order) values
    ('opportunities', 'konut', 'Konut', 1),
    ('opportunities', 'ticari', 'Ticari', 2),
    ('opportunities', 'arsa', 'Arsa', 3),
    ('opportunities', 'diger', 'Diğer', 4),
    ('docs', 'sozlesme', 'Sözleşmeler', 1),
    ('docs', 'iban', 'IBAN Bilgileri', 2),
    ('docs', 'logo', 'Logo & Marka', 3),
    ('docs', 'hazir-metin', 'Hazır Metinler', 4)
  on conflict (module, key) do nothing;

  select id into v_cat_konut from public.categories where module = 'opportunities' and key = 'konut';
  select id into v_cat_ticari from public.categories where module = 'opportunities' and key = 'ticari';
  select id into v_cat_arsa from public.categories where module = 'opportunities' and key = 'arsa';
  select id into v_cat_diger from public.categories where module = 'opportunities' and key = 'diger';
  select id into v_cat_docs_sozlesme from public.categories where module = 'docs' and key = 'sozlesme';
  select id into v_cat_docs_iban from public.categories where module = 'docs' and key = 'iban';

  -- ---- opportunities ----------------------------------------------------
  insert into public.opportunities (type, category_id, lead_ad, lead_telefon, ozet, konum, fiyat, status, owner_id, claimer_id, claimed_at)
  values
    ('satici', v_cat_konut, 'Mehmet Demir', '05551112233', 'Süleymanpaşa''da 3+1 daire satılık', 'Tekirdağ / Süleymanpaşa', 4750000, 'acik', v_ofis, null, null),
    ('alici', v_cat_ticari, 'Ayşe Şahin', '05552223344', 'Merkez''de dükkan arıyor', 'Tekirdağ / Merkez', 25000, 'claimed', v_ofis, v_danisman, now() - interval '2 days'),
    ('satici', v_cat_arsa, 'Hasan Öz', '05553334455', 'Çorlu''da 500 m² arsa', 'Tekirdağ / Çorlu', 1250000, 'acik', v_owner, null, null);

  -- ---- calendar_events + attendance --------------------------------------
  insert into public.calendar_events (type, title, start_at, end_at, creator_id) values
    ('toplanti', 'Haftalık Ofis Toplantısı', now() + interval '1 day', now() + interval '1 day' + interval '1 hour', v_owner),
    ('egitim', 'Power Camp - Modül 1', now() + interval '3 days', now() + interval '3 days' + interval '2 hours', v_broker);

  insert into public.event_attendance (event_id, user_id, status)
  select ce.id, u.id, 'davetli'
  from public.calendar_events ce
  cross join public.users u
  where u.rol = 'danisman';

  -- ---- education ------------------------------------------------------------
  insert into public.education_modules (title, description, sort_order) values
    ('RE/MAX Lavanda''ya Hoş Geldin', 'Ofis kültürü ve temel süreçler', 1),
    ('Müzakere Teknikleri', 'Power Camp - temel müzakere becerileri', 2);

  insert into public.badges (ad, aciklama) values
    ('İlk Fırsat', 'İlk fırsatı claim eden danışmana verilir'),
    ('Power Camp Mezunu', 'Tüm Power Camp modüllerini tamamlayanlara verilir');

  -- ---- onboarding checklist ---------------------------------------------
  insert into public.onboarding_checklist_items (tip, baslik, sort_order) values
    ('baslangic', 'Sözleşme imzalandı', 1),
    ('baslangic', 'IBAN bilgisi alındı', 2),
    ('baslangic', 'Portal hesabı oluşturuldu', 3),
    ('ayrilis', 'Devam eden fırsatlar devredildi', 1),
    ('ayrilis', 'Ofis malzemeleri teslim edildi', 2);

  -- ---- operasyon --------------------------------------------------------------
  insert into public.call_logs (kaynak, arayan_ad, arayan_telefon, assigned_to, sonuc, portfoy_alindi_mi, donus_yapildi_mi, opportunity_id) values
    ('Facebook Reklam', 'Fatma Yıldız', '05554445566', v_danisman2, 'ulasildi', false, true, null),
    ('Google Ads', 'Kemal Aydın', '05555556677', null, 'atanmadi', false, false, null);

  -- ---- lig ----------------------------------------------------------------
  insert into public.periods (ad, baslangic, bitis) values
    ('2026 - Dönem 2 (May-Ağu)', '2026-05-01', '2026-08-31')
  returning id into v_period;

  insert into public.score_entries (user_id, period_id, type, value, entered_by) values
    (v_danisman, v_period, 'ciro', 1250000, v_ofis),
    (v_danisman2, v_period, 'ciro', 980000, v_ofis),
    (v_danisman, v_period, 'memnuniyet', 92, v_ofis),
    (v_danisman2, v_period, 'memnuniyet', 88, v_ofis);

  -- ---- rehber -----------------------------------------------------------
  insert into public.docs (category_id, baslik, created_by) values
    (v_cat_docs_sozlesme, 'Standart Alıcı Sözleşmesi', v_broker),
    (v_cat_docs_iban, 'Ofis IBAN Bilgileri', v_broker);

  insert into public.doc_versions (doc_id, version_no, filename, url, is_current, uploaded_by)
  select id, 1, 'standart-alici-sozlesmesi-v1.pdf', 'https://example.com/docs/sozlesme-v1.pdf', true, v_broker
  from public.docs where baslik = 'Standart Alıcı Sözleşmesi';

end $$;
