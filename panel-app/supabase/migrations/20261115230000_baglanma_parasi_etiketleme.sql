-- Broker, 2026-11-15: "bağlanma parası" (depozito/kapora) hesabı
-- hareketleri gerçek gelir/gider değil — iki şirket hesabı (Ziraat,
-- Vakıfbank) arasında gidip gelen veya tamamlanmış (iade/vergi mahsubu)
-- transferler. 32'si tamamlanmış (çözüldü), 2'si hâlâ elde tutuluyor
-- (hangi fırsata ait olduğu bilinmiyor, broker'a soruldu).
update public.banka_hareketleri
set tur = 'baglanma_parasi', durum = 'cozuldu'
where id in (
  'fe538f78-8e6e-4120-99bc-ab2f0ce1650f', 'b80bbe08-33ea-46c0-9047-657cd965b990',
  '22fd5acc-37fa-4cf0-b722-2b24bae8c89e', 'e6e79e26-e960-436e-8158-2973628c42f8',
  'fa545387-2545-490a-becd-61ba465b23fe', '563a6fb2-7474-44ba-8180-6a638fdb6061',
  '8f554f38-794f-4b27-9592-d9bc7d0eabea', '118a170b-3c4c-433b-8270-7cf16429070b',
  '6e8945c7-1432-4d20-8f82-238bdf2113ea', '714a8eff-382e-4fbb-8c09-fbe822f0841b',
  '62c8c1c2-d7eb-4374-925b-3eacbe227f94', 'e0b9c02e-5874-4569-b365-8cef484f9030',
  'a4c7070a-41f8-4f4d-83c3-7744d2920127', '91c59aa0-bb1c-4ac3-b125-8c81269cf4a2',
  'ceb75387-324a-4719-b3a7-0c227609d5c6', 'aada3640-0446-4a1e-b2e2-19b4bd295fd2',
  '790d9a88-a9e1-46d8-bd39-aa417c28f233', 'f733607a-d9d3-4f27-92df-2e2138aa2a2f',
  'c4e8a0a8-7ac7-4532-b572-6318853d8974', 'e723ac11-0fd9-44fc-9840-9092a1fa95df',
  'ee302990-11c3-4971-b279-050c880d5736', '65c1858b-b951-412d-8493-e2b4d47c79fb',
  '6a6737fe-9c4e-4fbf-9ade-5987ee738086', 'a1af0bd5-d57c-45f9-964c-1e983cc78c88',
  '817a0ac2-dd35-4c32-b21a-2b80fea6aefd', '20c9cd5c-73d4-4ce5-8094-70c1edb2d6b3',
  'a61c5c24-7a3a-4042-a7ff-126dcfff22f8', 'ef3cfee7-9ee3-416c-aae2-688b6fd6c8c4',
  'e1e1529d-dbe9-4168-9438-52b4573a3ede', '55c1c446-ac65-4ecc-824e-a3daeffe3c10',
  '48de6bf7-8da7-4fcb-a418-395d1545e2c8', '2a5a7e2b-4268-4f06-9d7a-eaa4ae8631a9'
);

update public.banka_hareketleri
set tur = 'baglanma_parasi', durum = 'blokede'
where id in (
  'f4faca31-c954-465f-a797-3523e3eb8b3c', '2c006680-693c-4a67-b0b2-017862403385'
);
