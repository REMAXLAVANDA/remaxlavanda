// Görevler (Planlama > Görevler) — kim görür/yönetir kuralları, calendar
// events ve call_logs'takiyle aynı kalıp (bkz. lib/calendar.js, lib/callLogs.js).
import { ROLES } from './roles'

export const TASK_STATUS_LABELS = { bekliyor: 'Bekliyor', tamamlandi: 'Tamamlandı' }

// Atanan kişi kendi görevini her zaman görür; yönetim (broker/owner/ofis)
// verdiği/aldığı fark etmeksizin tüm görevleri görür (tasks_select RLS'iyle
// aynı kural).
export function canViewTask(task, user) {
  if (user.role === ROLES.BROKER || user.role === ROLES.OWNER || user.role === ROLES.OFIS) return true
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
