// Power Camp modülleri/rozetleri kaldırıldı (2026-10-07, broker kararı —
// "işimize yaramıyor, süreç içine dahil edeceğim"). Sadece checklist
// (süreç/ayrılış) kaldı — isModuleDone/moduleProgressFor/badgesFor
// kullanılmıyor artık, silindi.

export function checklistFor(userId, tip, items, statusList) {
  return items
    .filter((i) => i.tip === tip)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => {
      const status = statusList.find((s) => s.itemId === item.id && s.userId === userId)
      return { item, done: Boolean(status), doneAt: status?.doneAt, doneBy: status?.doneBy }
    })
}

export function checklistProgress(userId, tip, items, statusList) {
  const list = checklistFor(userId, tip, items, statusList)
  const completed = list.filter((l) => l.done).length
  return { completed, total: list.length, percent: list.length === 0 ? 0 : Math.round((completed / list.length) * 100) }
}
