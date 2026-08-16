import React, { useEffect } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import { UsersProvider } from '../context/UsersContext'
import Kartvizitim from './Kartvizitim'

// REGRESYON TESTİ — /kartvizitim route guard'sızdı: ofis menüde linki
// görmese de URL'den (#/kartvizitim) doğrudan girip kendi profilini
// düzenleyebiliyordu (bkz. docs/route-guard-eksikleri.md). Bu test SADECE
// bu erişim kontrolünü kapsıyor — sayfanın içeriğini/kaydetme mantığını
// test etmiyor (bkz. pages/Takvim.test.jsx'teki aynı AsRole deseni).
function AsRole({ role, children }) {
  const { setRole } = useAuth()
  useEffect(() => {
    setRole(role)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role])
  return children
}

async function renderKartvizitim(role) {
  const result = render(
    <MemoryRouter>
      <AuthProvider>
        <UsersProvider>
          <ToastProvider>
            <AsRole role={role}>
              <Kartvizitim />
            </AsRole>
          </ToastProvider>
        </UsersProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
  return result
}

describe('Kartvizitim erişim kontrolü', () => {
  afterEach(() => cleanup())

  it.each(['broker', 'owner', 'danisman'])('%s rolü Kartvizitim içeriğini görür', async (role) => {
    const { container } = await renderKartvizitim(role)
    await waitFor(() => expect(container.textContent).toContain('Sosyal Medya'))
  })

  it('ofis rolü Kartvizitim içeriğini hiç görmez (yönlendirilir)', async () => {
    const { container } = await renderKartvizitim('ofis')
    await waitFor(() => expect(container.textContent).not.toContain('Sosyal Medya'))
    expect(container.textContent).not.toContain('Fotoğraf Yükle')
  })
})
