import React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '../../context/AuthContext'
import { UsersProvider } from '../../context/UsersContext'
import { ToastProvider } from '../../context/ToastContext'
import AppLayout from './AppLayout'

// REGRESYON TESTİ — PART-4 sonrasında yaşanan layout bozulmasının kök
// nedeni: dış kapsayıcı `lg:flex` DEĞİLDİ, ama Sidebar `lg:static`
// (normal akışa dönüyor). Flex olmayan bir kapsayıcıda `static` bir
// <aside> ile onun yanına gelmesi gereken içerik sütunu YAN YANA değil,
// ALT ALTA diziliyordu — bu da masaüstünde içeriğin ~80-100px aşağıdan
// başlamasına, Topbar'ın Sidebar ile hizasız görünmesine, boş sayfada bile
// dikey scrollbar çıkmasına sebep oluyordu (bkz. konuşma kaydı).
//
// Bu test, o hatayı YENİDEN İNCELEMEDEN yakalayacak şekilde, gerçek
// render'dan sonra DOM'daki class'ları kontrol ediyor — "sidebar ve içerik
// aynı flex satırında mı" sorusunun kod seviyesindeki karşılığı.
//
// 2. TUR — commit 1171f79 (yalnızca lg:flex + lg:pl-64 kaldırma) gerçek
// Safari'de sorunu ÇÖZMEDİ. Kullanıcının kendi Safari testi hâlâ
// "sidebar/içerik üst hizası bozuk + gereksiz üst boşluk" bildirdi. Bu,
// Safari/WebKit'in `min-h-screen` (belirsiz/yüzde yükseklik) + iç içe
// flex + `sticky` Topbar kombinasyonunu tutarsız çözümlemesinden
// kaynaklanıyor olarak değerlendirildi. Düzeltme: `min-h-screen` + `sticky`
// tamamen terk edildi; onun yerine SABİT `h-screen overflow-hidden` dış
// kabuk + sadece <main> içinde `overflow-y-auto` kayan "app shell" deseni
// kullanıldı. Aşağıdaki ek assertion'lar bu mimarinin somut, testte
// doğrulanabilir karşılığı — biri bunu yanlışlıkla eski `min-h-screen`/
// `sticky` desenine geri döndürürse burada kırılır.
describe('AppLayout — masaüstü sidebar/içerik yerleşimi', () => {
  it('dış kapsayıcı lg:flex içeriyor (sidebar ile içerik yan yana dizilsin diye)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/panel']}>
        <AuthProvider>
          <UsersProvider>
            <ToastProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/panel" element={<div>İçerik</div>} />
                </Route>
              </Routes>
            </ToastProvider>
          </UsersProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const outer = container.firstElementChild
    expect(outer.className).toMatch(/\blg:flex\b/)

    // aside (Sidebar) ile içerik sütunu, dış kapsayıcının DOĞRUDAN
    // kardeşleri olmalı (aralarında ekstra bir sarmalayıcı olmadan) —
    // aksi halde flex sıralaması yine bozulabilir.
    const aside = outer.querySelector('aside')
    expect(aside).not.toBeNull()
    expect(aside.parentElement).toBe(outer)

    // İçerik sütunu artık Sidebar'ı "fixed" varsayıp pl-64 ile telafi
    // etmiyor — flex zaten doğru genişliği ayırıyor. Bu sınıf geri
    // gelirse (örn. birileri outer'daki lg:flex'i kaldırıp Sidebar'ı
    // tekrar lg:fixed yapmadan bunu eklerse) çift boşluk regresyonu
    // geri döner.
    expect(outer.innerHTML).not.toMatch(/lg:pl-64/)
  })

  it('dış kabuk sabit yükseklikte (h-screen + overflow-hidden) — sayfa değil <main> kayar', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/panel']}>
        <AuthProvider>
          <UsersProvider>
            <ToastProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/panel" element={<div>İçerik</div>} />
                </Route>
              </Routes>
            </ToastProvider>
          </UsersProvider>
        </AuthProvider>
      </MemoryRouter>,
    )

    const outer = container.firstElementChild
    // `min-h-screen` (belirsiz yükseklik) yerine sabit `h-screen` +
    // `overflow-hidden` — Safari'nin flex+sticky+min-height ile ilgili
    // bilinen tutarsızlığını bu üçlüyü tamamen ortadan kaldırarak önler.
    expect(outer.className).toMatch(/\bh-screen\b/)
    expect(outer.className).toMatch(/\boverflow-hidden\b/)
    expect(outer.className).not.toMatch(/\bmin-h-screen\b/)

    // Topbar artık "sticky" DEĞİL — dış kabuk zaten kaymadığı için gerek
    // yok. sticky geri gelirse bu Safari regresyon sınıfı da geri döner.
    const header = outer.querySelector('header')
    expect(header).not.toBeNull()
    expect(header.className).not.toMatch(/\bsticky\b/)

    // Sadece <main> kendi içinde kayıyor.
    const main = outer.querySelector('main')
    expect(main).not.toBeNull()
    expect(main.className).toMatch(/\boverflow-y-auto\b/)
  })
})
