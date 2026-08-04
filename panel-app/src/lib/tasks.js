// Görevler (Planlama > Görevler) — kim görür/yönetir kuralları, calendar
// events ve call_logs'takiyle aynı kalıp (bkz. lib/calendar.js, lib/callLogs.js).
import { ROLES } from './roles'

export const TASK_STATUS_LABELS = { bekliyor: 'Bekliyor', tamamlandi: 'Tamamlandı' }

// Atanan kişi kendi görevini her zaman görür; broker/owner verdiği/aldığı
// fark etmeksizin tüm görevleri görür (tasks_select RLS'iyle aynı kural).
// Ofis BİLEREK bu "hepsini gör" grubunda değil — danışmanla aynı kurala
// tabi (sadece kendi oluşturduğu veya kendisine atanan görevleri görür),
// broker: "danışman veya ofis kendi oluşturdukları hariç görevleri
// göremesin ... owner ofisi ve brokeri de görsün ... broker hepsini
// görsün" (owner zaten is_manager() ile "hepsini gör" grubunda).
export function canViewTask(task, user) {
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER) return true
  return task.assigneeId === user.id || task.createdBy === user.id
}

// Görev oluşturma/atama ve başkasının görevini düzenleme/silme sadece
// yönetimde — tasks_insert/tasks_manage RLS'iyle aynı kural.
export function canManageTasks(role) {
  return role === ROLES.BROKER || role === ROLES.OWNER || role === ROLES.OFIS
}

// Atanan kişi yönetim değilse bile KENDİ görevinin durumunu
// (bekliyor/tamamlandı) değiştirebilir — tasks_update RLS'iyle aynı kural.
export function canToggleTask(task, user) {
  return canManageTasks(user.role) || task.assigneeId === user.id
}

export function isOverdue(task) {
  if (task.status === 'tamamlandi' || !task.dueDate) return false
  return new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
}
