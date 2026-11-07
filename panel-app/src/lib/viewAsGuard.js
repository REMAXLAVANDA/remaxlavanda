// "Birini Olarak Görüntüle" (broker, 2026-11-07: "kullanıcılar arası
// geçiş yapabilir miyim danışman ofis vs onların ekranını görebilir
// miyim") — broker kendi hesabıyla (kendi gerçek oturumuyla) kalır,
// sadece EKRANDA o kişinin rolü/kimliğiyle görür (bkz. context/
// AuthContext.jsx useAuth() birleştirmesi). Bu dosya, bu mod aktifken
// HİÇBİR yazma isteğinin sunucuya gitmesini engelleyen tek kontrol
// noktası — React dışı (data provider katmanı context okuyamaz), bu
// yüzden düz bir modül değişkeni.
//
// Neden burada (client() içinde), getSupabaseClient()'ın kendisinde
// değil: oradaki tekil istemci .auth.* (gerçek giriş/çıkış/şifre) için
// de kullanılıyor — o hiçbir zaman engellenmemeli. Bu sarmalama SADECE
// supabaseProvider.js'in client()'ından ve storage.js'ten geçen
// .from()/.rpc() çağrılarını kapsıyor.

let active = false

export function setViewAsActive(value) {
  active = Boolean(value)
}

export function isViewAsActive() {
  return active
}

export function assertNotViewingAs() {
  if (active) {
    throw new Error('Birini görüntülüyorsun — bu modda değişiklik yapılamaz. Önce "Kendi hesabına dön".')
  }
}

// Ekranı doldurmak için GEREKEN okuma amaçlı RPC'ler — bunlar dışındaki
// her .rpc() çağrısı bir yazma/aksiyon'dur (bkz. supabaseProvider.js'teki
// tüm .rpc( çağrıları, bu liste elle o taramaya göre tutuluyor).
const READ_ONLY_RPCS = new Set([
  'get_opportunity_contact',
  'list_musteri_review_counts',
  'list_user_activity',
  'list_today_activity_hours',
  'get_kartvizit',
])

const BLOCKED_METHODS = new Set(['insert', 'update', 'upsert', 'delete'])

// Zincirleme (örn. .eq() sonrası .update()) ihtimaline karşı bu sarmalama
// REKÜRSİF — her metot çağrısının sonucu (nesneyse) tekrar sarmalanır, bu
// yüzden çağrı sırası ne olursa olsun insert/update/upsert/delete hep
// yakalanır. Thenable (await edilen) sonuçlar da aynı şekilde sarmalanır;
// .then çağrısı gerçek nesneye yönlendirildiği için await yine çalışır.
function guardQueryBuilder(builder) {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (active && BLOCKED_METHODS.has(prop)) {
        return () => {
          throw new Error('Birini görüntülüyorsun — bu modda değişiklik yapılamaz. Önce "Kendi hesabına dön".')
        }
      }
      const value = Reflect.get(target, prop, receiver)
      if (typeof value !== 'function') return value
      return (...args) => {
        const result = value.apply(target, args)
        return result && typeof result === 'object' ? guardQueryBuilder(result) : result
      }
    },
  })
}

// supabaseProvider.js'in client()'ı bunu çağırır — .from()/.rpc() dışında
// hiçbir şeye dokunmuyor, .auth/.storage/.channel olduğu gibi geçiyor
// (storage kendi dosyasında ayrıca korunuyor, bkz. storage.js).
export function guardSupabaseClient(raw) {
  return new Proxy(raw, {
    get(target, prop, receiver) {
      if (prop === 'from') {
        return (table) => guardQueryBuilder(target.from(table))
      }
      if (prop === 'rpc') {
        return (name, args, opts) => {
          if (active && !READ_ONLY_RPCS.has(name)) {
            throw new Error('Birini görüntülüyorsun — bu modda değişiklik yapılamaz. Önce "Kendi hesabına dön".')
          }
          return target.rpc(name, args, opts)
        }
      }
      const value = Reflect.get(target, prop, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}
