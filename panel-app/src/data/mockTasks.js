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
  // Ofis görünürlük daralması testi için (bkz. lib/tasks.js canViewTask) —
  // task-4 ofise ATANMIŞ (broker vermiş), task-5 ofisin KENDİ oluşturduğu.
  // İkisi de ofise görünmeli; task-1/2/3 (ofisle hiç ilgisi olmayan
  // broker→danışman görevleri) artık ofise görünmemeli.
  {
    id: 'task-4',
    title: 'Aylık gider evrakları muhasebeye teslim edilecek',
    description: null,
    assigneeId: 'u-ofis',
    createdBy: 'u-broker',
    dueDate: daysFromNow(3),
    status: 'bekliyor',
    completedAt: null,
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
  },
  {
    id: 'task-5',
    title: 'Vitrin ilanları güncellenecek',
    description: 'Satılan portföyler vitrinden kaldırılsın.',
    assigneeId: 'ext-danisman-2',
    createdBy: 'u-ofis',
    dueDate: daysFromNow(1),
    status: 'bekliyor',
    completedAt: null,
    createdAt: new Date(Date.now() - 1 * day).toISOString(),
  },
]
