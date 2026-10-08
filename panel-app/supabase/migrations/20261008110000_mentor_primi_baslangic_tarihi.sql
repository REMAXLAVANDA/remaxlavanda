-- 2026-10-08 broker kararı: Mentor Primi hesaplaması danışmanın portal
-- hesabının AÇILDIĞI tarihi (users.created_at) mentorluk başlangıcı
-- sayıyordu — broker: "danışman giriş tarihi otomatik seçildi ve herkesten
-- prim alıyor, biz başlangıç tarihini belirleyebilelim". Artık broker her
-- danışman için mentorluk başlangıç tarihini KENDİSİ belirliyor; hiç
-- belirlenmemiş bir danışman hesaplamaya hiç girmiyor (lib/mentorPrimi.js
-- artık created_at'e fallback YAPMIYOR — bkz. o dosyadaki değişiklik).
--
-- Ayrı bir tablo (user_private_info ile aynı desen) — bu veri de Mentor
-- Primi'nin geri kalanı gibi SADECE broker'a açık, owner dahil kimse
-- görmesin diye (bkz. canViewMentorPrimi).
create table public.mentor_primi_baslangic (
  user_id uuid primary key references public.users(id) on delete cascade,
  baslangic_tarihi date not null,
  set_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

alter table public.mentor_primi_baslangic enable row level security;

create policy mentor_primi_baslangic_manage on public.mentor_primi_baslangic
  for all to authenticated
  using (
    (select is_active())
    and (select current_user_role()) = 'broker'::user_role
  )
  with check (
    (select is_active())
    and (select current_user_role()) = 'broker'::user_role
  );
