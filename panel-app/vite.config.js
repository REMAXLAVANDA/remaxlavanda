import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Canlıdaki sürümün depoyla aynı olup olmadığını dışarıdan kontrol
// edebilmek için (bkz. AI_NOTLARI.md — "yayına alma kontrolü", deploy elle
// dist/ -> panel/ kopyalamaya bağlı, unutulursa canlı eskide kalıyor ve
// bunu yakalayan hiçbir şey yoktu). Her build'de commit hash'i dist köküne
// yazılır, panel.remaxlavanda.com.tr/BUILD_INFO.txt olarak yayınlanır.
function buildInfoPlugin() {
  return {
    name: 'build-info',
    closeBundle() {
      let commit = 'DOĞRULANMADI'
      try {
        commit = execSync('git rev-parse HEAD').toString().trim()
      } catch {
        // git yoksa (ör. paketlenmiş bir ortamda build alınıyorsa) sessizce
        // atla — bu bilgi olmadan da build çalışmaya devam etmeli.
      }
      const content = `commit=${commit}\nbuilt_at=${new Date().toISOString()}\n`
      writeFileSync(resolve(__dirname, 'dist/BUILD_INFO.txt'), content)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/panel/',
  plugins: [react(), tailwindcss(), buildInfoPlugin()],
})
