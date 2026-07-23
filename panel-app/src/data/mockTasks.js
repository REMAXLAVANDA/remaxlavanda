// Planlama > Görevler mock verisi.
const day = 24 * 60 * 60 * 1000
const daysFromNow = (n) => new Date(Date.now() + n * day).toISOString().slice(0, 10)

export const MOCK_TASKS = [
  {
    id: 'task-1',
    title: 'Batıraltı bölgesi için yeni ilan fotoğrafları çekilecek',
    description: 'Sabah saatlerinde, doğal ışıkla çekim yapılsın.',
    assigneeId: 'u-danisman',
    createdBy: 'u-broker',
    dueDate: daysFromNow(2),
    status: 'bekliyor',
    completedAt: null,
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
  },
  {
    id: 'task-2',
    title: 'Aylık ofis toplantısı sunumu hazırlanacak',
    description: null,
    assigneeId: 'ext-danisman-2',
    createdBy: 'u-broker',
    dueDate: daysFromNow(-1),
    status: 'bekliyor',
    completedAt: null,
    createdAt: new Date(Date.now() - 4 * day).toISOString(),
  },
  {
    id: 'task-3',
    title: 'Yeni danışman oryantasyon dosyası tamamlandı',
    description: 'Sözleşme ve rehber dokümanları teslim edildi.',
    assigneeId: 'ext-danisman-3',
    createdBy: 'u-broker',
    dueDate: daysFromNow(-3),
    status: 'tamamlandi',
    completedAt: new Date(Date.now() - 1 * day).toISOString(),
    createdAt: new Date(Date.now() - 6 * day).toISOString(),
  },
]
