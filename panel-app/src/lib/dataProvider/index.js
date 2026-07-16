// Tek giriş noktası: sayfalar SADECE bu dosyadan import eder, hangi
// sağlayıcının (mock/supabase) aktif olduğunu hiç bilmek zorunda kalmaz.
// Seçim tamamen lib/env.js'teki USE_SUPABASE'e göre yapılır — production
// build'de bu her zaman true'dur (bkz. env.js).

import { USE_SUPABASE } from '../env'
import * as mock from './mockProvider'
import * as real from './supabaseProvider'

const provider = USE_SUPABASE ? real : mock

export const opportunities = provider.opportunities
export const calendarEvents = provider.calendarEvents
export const education = provider.education
export const callLogs = provider.callLogs
export const docs = provider.docs
export const takip = provider.takip
export const league = provider.league
export const users = provider.users

// Debug/rapor amaçlı — hangi sağlayıcının aktif olduğunu görmek için
// (ör. ConfigErrorScreen veya gelecekteki bir "sistem durumu" ekranı).
export const activeSource = USE_SUPABASE ? 'supabase' : 'mock'
