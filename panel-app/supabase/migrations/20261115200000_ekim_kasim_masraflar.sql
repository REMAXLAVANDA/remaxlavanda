-- Broker, 2026-11-15: Muhasebecinin ayrıldığı dönemdeki (Ekim-Kasım 2026)
-- banka hareketlerinden NET masraf olarak ayrılan kalemler Portal'a
-- işleniyor (maaş, reklam/ilan, telefon/internet, banka ücretleri).
-- Hepsi 'ofis_gideri' — hiçbiri bir danışmanın kendi cari hesabına değil,
-- genel şirket giderine yazılıyor. masraf_olarak_isaretle() RPC'si
-- kullanılıyor (banka_hareketleri.durum='masraf' otomatik işleniyor).
--
-- DOKUNULMADI (bilerek dışarıda bırakıldı):
--   - 0b692e61-126c-4576-a8e5-a12a57dd7287 (640 TL, Hasan Uğur Savaşkan) —
--     hukuki konunun parçası, broker'a ayrı soruldu.
--   - 2644d70b (3.000 TL) ve adf9709d (17.000 TL) "İşletme Giderleri-
--     MASRAF YANSITMA" — kime ait olduğu belli değil, 'diger' kategorisine
--     işlendi ama broker'a ayrıca kime ait olduğu soruluyor.

-- 1) Yeni kategori: Telefon/İnternet
insert into public.categories (module, key, label, sort_order, is_active, visibility)
values ('masraflar', 'telefon_internet', 'Telefon/İnternet', 10, true, 'yonetim');

-- 2) Masraf kayıtları
do $$
declare
  v record;
begin
  for v in select * from (
    values
      ('2aec0d99-6a5a-4d77-be5a-18f8a37722f0'::uuid, 'eft_ucreti', null::text),
      ('fcbf0784-aeff-4cfa-8ffe-ca62b8f2256e'::uuid, 'eft_ucreti', null::text),
      ('c40189c3-9bf7-4383-8560-0b878aa179ca'::uuid, 'eft_ucreti', null::text),
      ('cbcb816c-2011-474f-a976-ba8a315cd4f5'::uuid, 'eft_ucreti', null::text),
      ('19cf3067-3713-40af-896f-77dc51d75001'::uuid, 'eft_ucreti', null::text),
      ('98f7e200-9aac-4de1-a9de-8c4c728a1f38'::uuid, 'eft_ucreti', null::text),
      ('b88d0edf-5c5f-478e-b04e-aaa35d3bf305'::uuid, 'eft_ucreti', null::text),
      ('bc8faa5a-ec5d-4e1f-a0b2-4032d93f58b3'::uuid, 'eft_ucreti', null::text),
      ('530daecb-16ee-400e-8beb-9f7c93b7df22'::uuid, 'eft_ucreti', null::text),
      ('885ace73-2e9a-47d6-9d7a-45752c79ed15'::uuid, 'eft_ucreti', null::text),
      ('a66fa5b3-1b57-435e-803e-e9b3234385f0'::uuid, 'telefon_internet', 'Telsam faturası'),
      ('527a75c9-52fa-4774-998f-7603ea1dc148'::uuid, 'maas', 'Maaş ödemesi - Beril Atay (masraf yansıtma)'),
      ('43a0d772-1ce4-4d29-ae26-dd1931c2e933'::uuid, 'maas', 'Maaş ödemesi - Beril Atay'),
      ('2dc25fee-c9f6-4c3e-a211-b34832d9ed7c'::uuid, 'maas', 'Maaş ödemesi - Bilgen Durmaz'),
      ('caec630c-b77d-47e8-a709-45b08f1af7ac'::uuid, 'maas', 'Maaş ödemesi - Elif Hançer'),
      ('0a8eaf7a-6299-46c2-8a0d-6b9b868d5d46'::uuid, 'maas', 'Maaş ödemesi - Özgül Korkmaz'),
      ('7c6fbddd-aeab-4506-ac80-b2f9e6192186'::uuid, 'eft_ucreti', null::text),
      ('30790d0f-08c1-4038-b41b-cac828bc35be'::uuid, 'eft_ucreti', null::text),
      ('7d301df6-9642-4e8b-989d-b05157c986e9'::uuid, 'eft_ucreti', null::text),
      ('1ad27645-b6a0-4810-ac51-ea0326f7f91b'::uuid, 'eft_ucreti', null::text),
      ('a9c32939-bf36-4b08-bebb-96f0c59ead43'::uuid, 'eft_ucreti', null::text),
      ('d88d82ab-4847-4fb9-a087-22389d7e55d0'::uuid, 'eft_ucreti', null::text),
      ('e8a93976-0b82-4db1-9809-0e29989ec903'::uuid, 'eft_ucreti', null::text),
      ('07697020-a63d-40cb-908c-cc608665593f'::uuid, 'eft_ucreti', null::text),
      ('3a9c7248-0c05-4bff-8171-825c51766355'::uuid, 'eft_ucreti', null::text),
      ('5a87de49-d620-4753-aea1-0b624b169de5'::uuid, 'eft_ucreti', null::text),
      ('2644d70b-87fe-43b6-add9-17a73272e197'::uuid, 'diger', 'İşletme Giderleri-Masraf Yansıtma (kime ait olduğu belirsiz, broker''a soruldu)'),
      ('adf9709d-4c1a-47f7-bb51-b3c9f2eff42d'::uuid, 'diger', 'İşletme Giderleri-Masraf Yansıtma (kime ait olduğu belirsiz, broker''a soruldu)'),
      ('99661121-b0a9-4395-9f3b-bd028d65ad36'::uuid, 'eft_ucreti', null::text),
      ('6896f914-a573-4c2b-9242-ad12a4536d9a'::uuid, 'eft_ucreti', null::text),
      ('e6ccb505-6b92-4d0e-ba08-c29d60c66b27'::uuid, 'eft_ucreti', null::text),
      ('126a9583-4e29-411c-8bbf-85d5a187406b'::uuid, 'eft_ucreti', null::text),
      ('66f5773b-56af-4152-a950-af135f7e09b2'::uuid, 'eft_ucreti', null::text),
      ('434b115e-657e-401a-abca-0282046ddc37'::uuid, 'eft_ucreti', null::text),
      ('7d2d7ff7-979f-458b-8eca-09af42efe7d7'::uuid, 'eft_ucreti', null::text),
      ('dbc5495a-0011-4e20-8d81-c27a25b1cc88'::uuid, 'eft_ucreti', null::text),
      ('64783016-ca47-4203-a5ff-d5d910e8d549'::uuid, 'eft_ucreti', null::text),
      ('83dd3766-4d19-4659-a2e5-3e1fe6121767'::uuid, 'eft_ucreti', null::text),
      ('b9b63b40-375e-4545-9b87-b8575713c755'::uuid, 'ilan_gideri', 'Sahibinden ödemesi'),
      ('f0c4e70a-ec00-4542-ae6b-0d97da84708e'::uuid, 'eft_ucreti', null::text),
      ('db58dc41-27f5-451e-9b21-7abdb6538379'::uuid, 'eft_ucreti', null::text),
      ('c187c0b7-2860-45c4-9809-54ccdbedd5c6'::uuid, 'eft_ucreti', null::text),
      ('db6620c4-3789-490e-a75f-ca74bfd0b326'::uuid, 'eft_ucreti', null::text),
      ('7f51d267-bc36-47b5-a213-a03a283ba274'::uuid, 'eft_ucreti', null::text),
      ('06d1072d-b035-43bb-8759-7af4175d5ba1'::uuid, 'eft_ucreti', null::text),
      ('06d83a29-b798-430c-a2e0-a675eca5c414'::uuid, 'eft_ucreti', null::text),
      ('00c9b82d-0e8d-4d52-a0ff-1e3bd83b4099'::uuid, 'eft_ucreti', null::text),
      ('093aaef6-88fe-4873-b22e-53efafe4ad9d'::uuid, 'eft_ucreti', null::text),
      ('d79ccb64-475a-4d4b-b4db-d16a5ab485a8'::uuid, 'eft_ucreti', null::text),
      ('1f5b3721-d84d-4b63-a580-b050d21aa728'::uuid, 'eft_ucreti', null::text),
      ('a9937825-2e6f-4df4-b0a8-a5447737c555'::uuid, 'eft_ucreti', null::text),
      ('fa50185a-b01d-4723-a6b4-82d001779b34'::uuid, 'eft_ucreti', null::text),
      ('9ab03603-2d54-4b46-bc78-07aa4a2719cd'::uuid, 'eft_ucreti', null::text),
      ('4bff7f05-ded4-41b2-93e0-2bd9b36f5870'::uuid, 'telefon_internet', 'Turkcell faturası'),
      ('6775eef5-33fb-4cf3-ae51-2af46333dc91'::uuid, 'telefon_internet', 'TTNET faturası'),
      ('6c658473-b301-4364-b6ce-89ebf70613de'::uuid, 'eft_ucreti', null::text),
      ('c1ecc0b7-bc47-4b65-9812-5c9aa890aa9c'::uuid, 'eft_ucreti', null::text),
      ('843d038f-c2e9-4e07-a865-203f5e5dd48e'::uuid, 'eft_ucreti', null::text),
      ('2bac176e-517b-44c9-9bd1-09ce9994e5ff'::uuid, 'eft_ucreti', null::text),
      ('57e77943-c232-4d92-83a0-ac327bc186cb'::uuid, 'eft_ucreti', null::text),
      ('c23f63b7-662b-46b0-a8e2-0e496e204be1'::uuid, 'eft_ucreti', null::text),
      ('24889a3e-2f70-41e3-bc95-b7921740c2de'::uuid, 'eft_ucreti', null::text),
      ('9d5fe7b3-b6d4-4b29-9e99-84412e091ea9'::uuid, 'eft_ucreti', null::text),
      ('73b5c68d-288b-45d9-a628-aa3218f4f015'::uuid, 'eft_ucreti', null::text),
      ('d822bccb-bba8-4781-a0bd-81f3ee7494ae'::uuid, 'eft_ucreti', null::text),
      ('db755b14-21d2-4be7-a8ca-f96eca796664'::uuid, 'eft_ucreti', null::text),
      ('1a164e55-7bc9-4269-8535-90c8a2dbbff5'::uuid, 'eft_ucreti', null::text),
      ('f2561d5b-334f-4e75-a05f-aa589927e719'::uuid, 'eft_ucreti', null::text),
      ('737b96ec-d7e1-4a7e-ab26-7112751dc531'::uuid, 'eft_ucreti', null::text),
      ('6497a1c8-5191-4ea5-b436-a32af8d669ab'::uuid, 'eft_ucreti', null::text),
      ('f2cbdbdc-349d-4ce3-8484-e79b98127a08'::uuid, 'eft_ucreti', null::text),
      ('934f9d67-a757-45ad-b7fc-6fb84ba5f65e'::uuid, 'telefon_internet', 'Telsam faturası'),
      ('b7fbd020-9090-4ec5-ab50-1dfbe616fdc9'::uuid, 'maas', 'Maaş ödemesi - Elif Tonbul (masraf yansıtma)'),
      ('07247c9d-f99d-492b-9412-bd1bef417cc2'::uuid, 'maas', 'Maaş ödemesi - Elif Tonbul'),
      ('892afd30-7c06-4022-9fc6-e8fa5fe7940f'::uuid, 'maas', 'Maaş ödemesi - Bilgen Durmaz'),
      ('396e9b86-666b-4785-bad4-a92c628e40e1'::uuid, 'maas', 'Maaş ödemesi - Elif Hançer'),
      ('cbe3664e-5b2d-4ccb-8a5a-ca2ac398d8c4'::uuid, 'maas', 'Maaş ödemesi - Özgül Korkmaz'),
      ('26979b32-0741-4394-96e2-c17f477c3714'::uuid, 'eft_ucreti', null::text),
      ('bf6b0e4f-6b39-469f-9dac-22629a039398'::uuid, 'eft_ucreti', null::text),
      ('9950be6e-3c6f-4665-ab42-a8f6eb6a811e'::uuid, 'eft_ucreti', null::text),
      ('a26aec7a-959d-446f-804f-7e513833768b'::uuid, 'eft_ucreti', null::text),
      ('27b7c837-cdb9-42dd-921e-13e9cc8d6db2'::uuid, 'pazarlama', 'Google reklam ödemesi'),
      ('b3797b08-e94a-417c-a339-215b178f47ab'::uuid, 'eft_ucreti', null::text),
      ('cce776b0-0198-403c-b101-b9e1a125e3ca'::uuid, 'eft_ucreti', null::text)
  ) as t(banka_hareketi_id, tur, aciklama)
  loop
    perform public.masraf_olarak_isaretle(v.banka_hareketi_id, v.tur, v.aciklama, 'ofis_gideri');
  end loop;
end $$;
