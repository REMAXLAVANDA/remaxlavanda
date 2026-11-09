-- Broker, 2026-11-09: onaylanmış bir ciro raporunda işlem tipi/kategori/
-- tapu-site bilgisi gibi SINIFLANDIRMA alanlarında hata olursa (ör.
-- satılık yazılmış ama aslında kiralıkmış), şu ana kadar düzeltme yolu
-- yoktu. Tutar/katılımcı/pay oranı gibi zaten Cari Hesap'a/Lig'e yazılmış
-- alanlara BİLEREK dokunulmuyor (o ayrı, çok daha riskli bir karar) —
-- sadece aşağıdaki 4 alan, hiçbiri Lig puanını/Cari Hesap tutarını
-- değiştirmiyor (approve_ciro_raporu'daki hesaplamalar bunlara bağlı
-- değil). Her değişiklik kim/ne zaman/eski-yeni değer olarak kayda
-- geçiyor — "puan/kayıt sessizce değişmesin" kuralıyla tutarlı
-- (komisyon_farki_gecmisi ile AYNI desen).
create table public.ciro_raporu_duzeltme_gecmisi (
  id uuid primary key default gen_random_uuid(),
  ciro_raporu_id uuid not null references public.ciro_raporlari(id),
  alan text not null,
  eski_deger text,
  yeni_deger text,
  duzelten_id uuid not null,
  duzeltme_tarihi timestamptz not null default now()
);
alter table public.ciro_raporu_duzeltme_gecmisi enable row level security;
create policy ciro_raporu_duzeltme_gecmisi_select on public.ciro_raporu_duzeltme_gecmisi
  for select to authenticated using ((select is_finans_yetkili()));

create function public.duzelt_ciro_raporu_alanlari(
  p_rapor_id uuid,
  p_islem_tipi text default null,
  p_rapor_kategori text default null,
  p_site_adi text default null,
  p_tapu_bilgileri text default null
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_rapor record;
  v_duzelten uuid := auth.uid();
begin
  if not (select is_manager()) then
    raise exception 'Bu işlem için yetkin yok.';
  end if;

  select * into v_rapor from public.ciro_raporlari where id = p_rapor_id for update;
  if not found then
    raise exception 'Rapor bulunamadı.';
  end if;

  if p_islem_tipi is not null and p_islem_tipi is distinct from v_rapor.islem_tipi then
    insert into public.ciro_raporu_duzeltme_gecmisi (ciro_raporu_id, alan, eski_deger, yeni_deger, duzelten_id)
      values (p_rapor_id, 'islem_tipi', v_rapor.islem_tipi, p_islem_tipi, v_duzelten);
  end if;
  if p_rapor_kategori is not null and p_rapor_kategori is distinct from v_rapor.rapor_kategori then
    insert into public.ciro_raporu_duzeltme_gecmisi (ciro_raporu_id, alan, eski_deger, yeni_deger, duzelten_id)
      values (p_rapor_id, 'rapor_kategori', v_rapor.rapor_kategori, p_rapor_kategori, v_duzelten);
  end if;
  if p_site_adi is not null and p_site_adi is distinct from v_rapor.site_adi then
    insert into public.ciro_raporu_duzeltme_gecmisi (ciro_raporu_id, alan, eski_deger, yeni_deger, duzelten_id)
      values (p_rapor_id, 'site_adi', v_rapor.site_adi, p_site_adi, v_duzelten);
  end if;
  if p_tapu_bilgileri is not null and p_tapu_bilgileri is distinct from v_rapor.tapu_bilgileri then
    insert into public.ciro_raporu_duzeltme_gecmisi (ciro_raporu_id, alan, eski_deger, yeni_deger, duzelten_id)
      values (p_rapor_id, 'tapu_bilgileri', v_rapor.tapu_bilgileri, p_tapu_bilgileri, v_duzelten);
  end if;

  update public.ciro_raporlari set
    islem_tipi = coalesce(p_islem_tipi, islem_tipi),
    rapor_kategori = coalesce(p_rapor_kategori, rapor_kategori),
    site_adi = coalesce(p_site_adi, site_adi),
    tapu_bilgileri = coalesce(p_tapu_bilgileri, tapu_bilgileri)
  where id = p_rapor_id;
end;
$function$;

revoke execute on function public.duzelt_ciro_raporu_alanlari(uuid, text, text, text, text) from public, anon;

-- Birgül Özdemir'in 2026-10-27 tarihli, 190.000 TL'lik raporu (id
-- fefe92bf-86ff-4a44-904e-ba923815acb4) "satış" olarak girilmiş, aslında
-- kiralıkmış — broker'ın açık talimatıyla düzeltiliyor. Migration içinde
-- auth.uid() olmadığı için yukarıdaki RPC yerine doğrudan (aynı mantıkla,
-- kayda geçirerek) yapılıyor; duzelten_id broker'ın kendi id'si.
insert into public.ciro_raporu_duzeltme_gecmisi (ciro_raporu_id, alan, eski_deger, yeni_deger, duzelten_id)
  select id, 'islem_tipi', islem_tipi, 'kiralama', '18916ade-21a9-444e-abab-003911bd1d50'
  from public.ciro_raporlari where id = 'fefe92bf-86ff-4a44-904e-ba923815acb4' and islem_tipi is distinct from 'kiralama';

update public.ciro_raporlari set islem_tipi = 'kiralama' where id = 'fefe92bf-86ff-4a44-904e-ba923815acb4';
