import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `--mode inventory` builds the standalone Inventory Management app
// (inventory.teckvora.com) from inventory.html instead of index.html -
// same src/, different entry + shell (src/inventory_app/).
const INVENTORY_HTML = 'inventory.html'

// Dev: serve inventory.html for every page URL (SPA fallback).
// Build: rename the emitted inventory.html to index.html so the web server
// config is identical to the main app's.
function inventoryEntry() {
  let outDir
  return {
    name: 'inventory-entry',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url || '/'
        const accept = req.headers.accept || ''
        if (req.method === 'GET' && accept.includes('text/html') && !path.extname(url.split('?')[0])) {
          req.url = `/${INVENTORY_HTML}`
        }
        next()
      })
    },
    closeBundle() {
      const from = path.join(outDir, INVENTORY_HTML)
      if (fs.existsSync(from)) fs.renameSync(from, path.join(outDir, 'index.html'))
    },
  }
}

export default defineConfig(({ mode }) => {
  const isInventory = mode === 'inventory'

  return {
    plugins: [react(), tailwindcss(), ...(isInventory ? [inventoryEntry()] : [])],
    ...(isInventory && {
      build: {
        outDir: 'dist-inventory',
        rollupOptions: { input: path.resolve(import.meta.dirname, INVENTORY_HTML) },
      },
    }),
    server: {
      port: isInventory ? 5175 : 5173,
    },
  }
})
