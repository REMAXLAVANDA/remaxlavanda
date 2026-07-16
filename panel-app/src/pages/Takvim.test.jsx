import React, { useEffect } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { UsersProvider } from '../context/UsersContext'
import Takvim from './Takvim'

// REGRESYON TESTİ — bu dosya 2026-07-15'te bildirilen "Takvim açılmıyor"
// şikayeti yüzünden var.
//
// DURUM: KAPANDI — kullanıcı 2026-07-15'te gerçek Safari'de doğruladı
// ("Takvim çalışıyor"). En olası neden hâlâ kesin ispatlanmadı (yalnızca
// zaman çizelgesinden çıkarıldı): aynı oturumda bir dosya sistemi kilidini
// aşmaya çalışırken App.jsx/AuthContext.jsx dosyaları geçici olarak
// silinmişti; kullanıcı muhtemelen tam o pencerede test etti. Bu build/lint
// tarafından yakalanmazdı çünkü ikisi de sadece statik/derleme zamanı
// kontrolüdür, gerçek render'ı hiç denemez.
// Bu test Takvim'i gerçekten DOM'a render eder — App.jsx, AuthContext.jsx,
// ToastContext.jsx, UsersContext.jsx, dataProvider, lib/calendar.js veya
// FullCalendar entegrasyonundaki KIRICI bir değişiklik artık burada
// yakalanır, sayfayı elle açmayı beklemeden.
//
// PART-5A NOTU: Takvim artık dataProvider + useAsyncList üzerinden veri
// yüklüyor (mockProvider'da yapay 250ms gecikme var) — bu yüzden testler
// artık async ve `.fc`'nin DOM'a gelmesini `waitFor` ile bekliyor; ilk
// render anında sadece "Yükleniyor..." durumu görünür.
function AsRole({ role, children }) {
  const { setRole } = useAuth()
  useEffect(() => {
    setRole(role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])
  return children
}

async function renderTakvim(role) {
  const errors = []
  const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args.map(String).join(' '))
  })

  const result = render(
    <MemoryRouter>
      <AuthProvider>
        <UsersProvider>
          <ToastProvider>
            <AsRole role={role}>
              <Takvim />
            </AsRole>
          </ToastProvider>
        </UsersProvider>
      </AuthProvider>
    </MemoryRouter>,
  )

  await waitFor(() => expect(result.container.querySelector('.fc')).not.toBeNull())

  spy.mockRestore()
  return { ...result, errors }
}

describe('Takvim sayfası render regresyonu', () => {
  afterEach(() => cleanup())

  it.each(['broker', 'owner', 'ofis', 'danisman'])('%s rolüyle hata fırlatmadan render edilir', async (role) => {
    const { container, errors } = await renderTakvim(role)

    expect(errors).toEqual([])
    expect(container.textContent).toContain('Takvim')
  })

  it('FullCalendar grid bileşenini gerçekten DOM üzerine mount eder', async () => {
    const { container } = await renderTakvim('broker')
    expect(container.querySelector('.fc')).not.toBeNull()
  })

  it('"Yeni Etkinlik" butonu sadece yönetici rollerinde görünür', async () => {
    const { queryByText: queryManager } = await renderTakvim('broker')
    expect(queryManager('Yeni Etkinlik')).not.toBeNull()
    cleanup()

    const { queryByText: queryDanisman } = await renderTakvim('danisman')
    expect(queryDanisman('Yeni Etkinlik')).toBeNull()
  })
})
