-- 2. Aşama Adım 2 (docs/muhasebe-tasarim.md madde f): tedarikçi carisi.
-- Bugüne kadar sadece ÖDEME (tedarikci_odemeleri) tutuluyordu — gelen
-- faturanın BORÇ tarafı hiç kayıtlı değildi, yani "bu tedarikçiye ne
-- kadar borcumuz var" sorusunun cevabı yoktu. Bu tablo o boşluğu
-- dolduruyor; ödeme akışı DEĞİŞMİYOR, sadece üstüne fatura/borç takibi
-- ekleniyor (tedarikci_odemeleri'ne opsiyonel bir fatura bağlantısı
-- geliyor).
create table public.tedarikci_faturalari (
  id uuid primary key default gen_random_uuid(),
  tedarikci_adi text not null,
  vergi_no text,
  fatura_no text,
  fatura_tarihi date not null,
  vade_tarihi date,
  tutar numeric not null check (tutar > 0),
  kdv_tutari numeric,
  fatura_dosya_url text,
  aciklama text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.tedarikci_faturalari enable row level security;

create policy tedarikci_faturalari_select on public.tedarikci_faturalari
  for select to authenticated using ((select is_finans_yetkili()));
create policy tedarikci_faturalari_insert on public.tedarikci_faturalari
  for insert to authenticated with check ((select is_finans_yetkili()) and created_by = (select auth.uid()));
create policy tedarikci_faturalari_update on public.tedarikci_faturalari
  for update to authenticated using ((select is_manager())) with check ((select is_manager()));
create policy tedarikci_faturalari_delete on public.tedarikci_faturalari
  for delete to authenticated using ((select is_manager()));

alter table public.tedarikci_odemeleri
  add column tedarikci_fatura_id uuid references public.tedarikci_faturalari(id);
create index tedarikci_odemeleri_fatura_idx on public.tedarikci_odemeleri (tedarikci_fatura_id);

-- Defter köprüsü (Adım 1'in devamı, madde b/c): bir fatura kaydedilince
-- borcumuz artar → (gider, borç) + (cari_tedarikci, alacak). Ödeme zaten
-- Adım 1'de bağlandı (defter_tedarikci_odeme_senkronize). Tedarikçi
-- kimliği henüz ayrı bir tablo olmadığı için AYNI md5(ad) türetmesi
-- kullanılıyor (defter_tedarikci_odeme_senkronize ile TUTARLI olması
-- şart — aksi halde aynı tedarikçinin fatura ve ödemesi deftede farklı
-- "kişi" sayılır).
create or replace function public.defter_tedarikci_faturasi_senkronize()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from defter_kayitlari where kaynak_tablo = 'tedarikci_faturalari' and kaynak_id = old.id;
    return old;
  end if;

  insert into defter_kayitlari (tarih, hesap_tip, kategori, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values (new.fatura_tarihi, 'gider', 'tedarikci_faturasi', 'borc', new.tutar, 'tedarikci_faturalari', new.id, new.tedarikci_adi);
  insert into defter_kayitlari (tarih, hesap_tip, hesap_id, yon, tutar, kaynak_tablo, kaynak_id, aciklama)
  values (new.fatura_tarihi, 'cari_tedarikci', md5(lower(trim(new.tedarikci_adi)))::uuid, 'alacak', new.tutar, 'tedarikci_faturalari', new.id, new.tedarikci_adi);
  return new;
end;
$$;

create trigger defter_tedarikci_faturasi_sync
  after insert or delete on public.tedarikci_faturalari
  for each row execute function public.defter_tedarikci_faturasi_senkronize();
