-- Finans modülü, madde 1 (broker onayı 2026-11-06): "bağlanma parası
-- (emanet) mantığı" — mevcut bloke/mahsup akışı (banka_hareketleri.tur=
-- 'baglanma_parasi', durum='blokede'/'cozuldu') korunuyor, üzerine ayrı,
-- değiştirilemez bir defter ekleniyor. Amaç: emanet bakiyesi tek bir
-- `durum` alanından değil, hareketlerin toplamından hesaplansın; kısmi
-- çıkışlar (bir kısmı mahsup, kalanı iade) desteklensin.
--
-- Immutable: emanet_hareketleri'ne UPDATE/DELETE politikası YOK (RLS açık,
-- sadece SELECT politikalı) — satırlar sadece migration 20261106100100'deki
-- cozumle_emanet() SECURITY DEFINER fonksiyonu üzerinden eklenir. Düzeltme
-- gerekirse ters hareket eklenir, mevcut satır asla değiştirilmez.
--
-- emanetler'in açılış (giriş) satırı da elle değil, aşağıdaki trigger ile
-- otomatik oluşuyor — bir bloke banka_hareketleri satırı eklenince (sadece
-- broker/owner ekleyebiliyor, bkz. banka_hareketleri_insert_self'in
-- durum='eslesmedi' şartı yüzünden danışman/ofis zaten bloke giremiyor).

create table public.emanetler (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id),
  gonderen_adi text,
  acilis_banka_hareketi_id uuid references public.banka_hareketleri(id),
  -- Sadece hızlı filtre/listeleme için — gerçek bakiye her zaman
  -- emanet_hareketleri toplamından hesaplanır (bkz. emanet_bakiyesi()),
  -- bu alan tek doğruluk kaynağı DEĞİL.
  durum text not null default 'acik' check (durum in ('acik', 'kapandi')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index emanetler_opportunity_idx on public.emanetler (opportunity_id);
create index emanetler_durum_idx on public.emanetler (durum);

alter table public.emanetler enable row level security;

-- Banka Hareketleri ile AYNI görünürlük seviyesi (bkz. banka_hareketleri_
-- manage) — emanet, bloke'nin devamı, ayrı bir yetki seviyesi olmamalı.
create policy emanetler_select on public.emanetler
  for select to authenticated
  using ((select is_manager()));

create table public.emanet_hareketleri (
  id uuid primary key default gen_random_uuid(),
  emanet_id uuid not null references public.emanetler(id),
  tutar numeric not null check (tutar > 0),
  yon text not null check (yon in ('giris', 'cikis')),
  -- Sadece çıkışta dolu — aşağıdaki constraint zorluyor.
  cikis_nedeni text check (cikis_nedeni in ('alici_iadesi', 'saticiya_odeme', 'hizmet_bedeline_mahsup')),
  tarih date not null,
  islemi_yapan_id uuid references public.users(id),
  -- Mahsup senaryosunda NULL kalır (gerçek yeni bir banka hareketi yok,
  -- zaten gelmiş paranın etiketi değişiyor) — bunun yerine
  -- ciro_raporu_katilimci_id dolar.
  banka_hareketi_id uuid references public.banka_hareketleri(id),
  ciro_raporu_katilimci_id uuid references public.ciro_raporu_katilimcilari(id),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  constraint emanet_hareketleri_cikis_nedeni_tutarliligi check (
    (yon = 'giris' and cikis_nedeni is null) or
    (yon = 'cikis' and cikis_nedeni is not null)
  )
);

create index emanet_hareketleri_emanet_idx on public.emanet_hareketleri (emanet_id);

alter table public.emanet_hareketleri enable row level security;

create policy emanet_hareketleri_select on public.emanet_hareketleri
  for select to authenticated
  using ((select is_manager()));

-- Gerçek doğruluk kaynağı — her yerde (ekran, RPC) bu fonksiyon çağrılır,
-- bakiye asla ayrı bir sütunda tutulup senkron dışı kalma riski taşımaz.
create or replace function public.emanet_bakiyesi(p_emanet_id uuid)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(case when yon = 'giris' then tutar else -tutar end), 0)
  from public.emanet_hareketleri
  where emanet_id = p_emanet_id;
$$;

grant execute on function public.emanet_bakiyesi(uuid) to authenticated;

-- Bloke banka hareketi eklenince emanet otomatik açılır — uygulama
-- kodunun (bankaHareketleri.create()) hiç değişmesine gerek kalmıyor.
create or replace function public.emanet_olustur_bloke_girisinde()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emanet_id uuid;
begin
  if new.tur = 'baglanma_parasi' and new.durum = 'blokede' and new.tip = 'giris' and new.opportunity_id is not null then
    insert into public.emanetler (opportunity_id, gonderen_adi, acilis_banka_hareketi_id, created_by)
    values (new.opportunity_id, new.gonderen_adi, new.id, new.olusturan_id)
    returning id into v_emanet_id;

    insert into public.emanet_hareketleri (emanet_id, tutar, yon, tarih, islemi_yapan_id, banka_hareketi_id, created_by)
    values (v_emanet_id, new.tutar, 'giris', new.tarih, new.olusturan_id, new.id, new.olusturan_id);
  end if;
  return new;
end;
$$;

create trigger banka_hareketleri_emanet_olustur
  after insert on public.banka_hareketleri
  for each row execute function public.emanet_olustur_bloke_girisinde();
