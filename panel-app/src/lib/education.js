export function isModuleDone(moduleId, userId, progress) {
  return progress.some((p) => p.moduleId === moduleId && p.userId === userId)
}

export function moduleProgressFor(userId, modules, progress) {
  const completed = modules.filter((m) => isModuleDone(m.id, userId, progress)).length
  const total = modules.length
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }
}

export function badgesFor(userId, userBadges, badges) {
  return userBadges
    .filter((ub) => ub.userId === userId)
    .map((ub) => ({ ...badges.find((b) => b.id === ub.badgeId), earnedAt: ub.earnedAt }))
    .filter((b) => b.id)
}

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
