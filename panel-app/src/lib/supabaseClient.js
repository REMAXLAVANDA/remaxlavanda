import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY, HAS_SUPABASE_CONFIG, USE_SUPABASE } from './env'

export class MissingSupabaseConfigError extends Error {
  constructor() {
    super('Supabase yapılandırması eksik (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).')
    this.name = 'MissingSupabaseConfigError'
  }
}

let client = null

// Tembel (lazy) tekil istemci — modül yüklenirken değil, ilk gerçekten
// ihtiyaç duyulduğunda oluşturulur. Böylece mock modda (USE_SUPABASE=false)
// hiç Supabase istemcisi kurulmaz, env eksik olsa bile uygulama açılır.
export function getSupabaseClient() {
  if (!USE_SUPABASE) return null
  if (!HAS_SUPABASE_CONFIG) throw new MissingSupabaseConfigError()

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
