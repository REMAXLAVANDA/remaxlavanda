// Mock aşamasında "kim kimdir" sorusuna tek yerden cevap veren yardımcı.
// Gerçek Supabase entegrasyonunda bunun yerine public.users tablosundan
// fetchList('users') kullanılacak.
import { MOCK_USERS } from '../context/AuthContext'
import { OTHER_USERS } from '../data/mockOpportunities'

export const KNOWN_USERS = Object.fromEntries(
  [...Object.values(MOCK_USERS), ...Object.values(OTHER_USERS)].map((u) => [u.id, u]),
)

export function userName(id) {
  return KNOWN_USERS[id]?.name ?? '—'
}
