-- Cari Hesap sistemi: her danışmanın bize/bizim ona olan borç-alacak
-- defteri. 3 kaynaktan besleniyor: Ciro Raporu hizmet bedeli faturası
-- (alacak), işleme bağlı masraf + aylık ofis faturası — sahibinden ilan
-- bedeli + ofis katılım bedeli (borç). Banka Hareketleri'nden gelen/giden
-- para bu kalemleri "kapatıyor" (bkz. banka_hareketleri genişletmesi).

create table public.cari_hareketler (
  id uuid primary key default gen_random_uuid(),
  danisman_id uuid not null references public.users(id),
  tarih date not null,
  tur text not null check (tur in ('borc', 'alacak')),
  tutar numeric not null check (tutar > 0),
  kategori text not null check (kategori in ('hizmet_bedeli', 'sahibinden_bedeli', 'ofis_katilim_bedeli', 'islem_masrafi', 'diger')),
  aciklama text,
  -- Otomatik oluşan kalemler nereden geldiğini izlesin diye (ciro raporu
  -- onayı/fatura girişi gibi) — manuel girilenlerde ikisi de boş kalır.
  kaynak_tip text check (kaynak_tip in ('ciro_raporu_katilimcisi', 'islem_masrafi', 'manuel')),
  kaynak_id uuid,
  durum text not null default 'acik' check (durum in ('acik', 'kapandi')),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index cari_hareketler_danisman_idx on public.cari_hareketler (danisman_id);
create index cari_hareketler_durum_idx on public.cari_hareketler (durum);

alter table public.cari_hareketler enable row level security;

-- Para hareketleri hassas — danışman SADECE kendi cari hesabını görür
-- (okuma), yönetme (ekleme/kapatma) sadece broker/owner. Ciro Raporu
-- onayıyla aynı yetki felsefesi.
create policy cari_hareketler_select on public.cari_hareketler
  for select to authenticated
  using ((select is_manager()) or danisman_id = (select auth.uid()));

create policy cari_hareketler_insert on public.cari_hareketler
  for insert to authenticated
  with check ((select is_manager()));

create policy cari_hareketler_update on public.cari_hareketler
  for update to authenticated
  using ((select is_manager()))
  with check ((select is_manager()));

-- İşleme (ciro raporuna) bağlı masraf detayları — tapu harcı, ilan
-- gideri vb. danisman_id doluysa o danışmanın cari hesabına borç olarak
-- yazılır (bkz. app katmanı), boşsa sadece dosya masrafı olarak kalır.
create table public.islem_masraflari (
  id uuid primary key default gen_random_uuid(),
  ciro_raporu_id uuid not null references public.ciro_raporlari(id),
  danisman_id uuid references public.users(id),
  tur text not null check (tur in ('tapu_harci', 'ilan_gideri', 'diger')),
  aciklama text,
  tutar numeric not null check (tutar > 0),
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index islem_masraflari_ciro_raporu_idx on public.islem_masraflari (ciro_raporu_id);

alter table public.islem_masraflari enable row level security;

create policy islem_masraflari_manage on public.islem_masraflari
  for all to authenticated
  using ((select is_manager()))
  with check ((select is_manager()));

-- Banka Hareketleri genişletmesi: artık sadece "gelen ciro ödemesi" değil,
-- giriş/çıkış ayrımı + bloke (bağlanma parası, tapu gününü bekliyor) +
-- fırsatla direkt eşleştirme (ciro raporu henüz açılmamış olabilir) +
-- cari hesap kalemiyle eşleştirme (hem alacak hem borç kalemleri için
-- genel amaçlı).
alter table public.banka_hareketleri
  add column tip text not null default 'giris' check (tip in ('giris', 'cikis')),
  add column opportunity_id uuid references public.opportunities(id),
  -- Bir çıkış hareketi (geri ödeme/satıcıya gönderim) hangi bloke
  -- (bağlanma parası) kaydından kaynaklandı.
  add column ust_hareket_id uuid references public.banka_hareketleri(id),
  add column tur text not null default 'diger' check (tur in ('baglanma_parasi', 'diger')),
  add column eslesen_cari_hareket_id uuid references public.cari_hareketler(id),
  -- Kısmi mahsup senaryosunda (bloke tutarının bir kısmı hizmet
  -- bedeline mahsup edilip kalanı gönderildiğinde) gerçek mahsup
  -- tutarı — boşsa bloke tutarının TAMAMI mahsup edildi demektir.
  add column mahsup_tutari numeric;

alter table public.banka_hareketleri
  drop constraint banka_hareketleri_durum_check,
  add constraint banka_hareketleri_durum_check check (durum in ('eslesmedi', 'eslesti', 'blokede', 'cozuldu'));
