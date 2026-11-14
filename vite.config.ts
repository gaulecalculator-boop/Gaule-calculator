
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    // GitHub repository base path
    base: '/gaulecalculator/',

    plugins: [
      react(),
      tailwindcss(),

      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',

        includeAssets: [
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'assets/aistudio/IMG_20261113_104800_d465bc78.png',
        ],

        manifest: {
          id: '/gaulecalculator/',
          name: 'GHAULE CALCULATOR - Nepal Offline Calculator Hub',
          short_name: 'GhauleCalc',
          description:
            'Nepal All-in-One Offline Calculator Hub - Doodh, Byaj, Price to Weight, Land area and more.',

          dir: 'ltr',
          lang: 'en',

          theme_color: '#1d4ed8',
          background_color: '#f8fafc',

          display: 'standalone',
          orientation: 'portrait',

          start_url: '/gaulecalculator/',
          scope: '/gaulecalculator/',

          prefer_related_applications: false,

          categories: [
            'finance',
            'utilities',
            'productivity',
          ],

          icons: [
            {
              src: '/gaulecalculator/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/gaulecalculator/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/gaulecalculator/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },

        workbox: {
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,woff,woff2}',
          ],

          globIgnores: [
            '**/assets/aistudio/Screenshot_*',
            '**/assets/aistudio/file_*',
            'downloads/**',
          ],

          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,

          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/__/,
          ],

          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith('/api/') ||
                url.hostname.includes('googleapis.com') ||
                url.hostname.includes('firebaseio.com') ||
                url.hostname.includes('identitytoolkit'),

              handler: 'NetworkOnly',
            },

            {
              urlPattern: ({ request }) =>
                request.destination === 'image' ||
                request.destination === 'font',

              handler: 'CacheFirst',

              options: {
                cacheName: 'ghaule-static-assets-v1',

                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 90,
                },
              },
            },
          ],
        },

        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],

    build: {
      sourcemap: false,
      minify: 'esbuild',
      target: 'es2020',
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1200,

      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (
                id.includes('react-dom') ||
                id.includes('/react/')
              ) return 'vendor-react';

              if (
                id.includes('firebase') ||
                id.includes('@firebase')
              ) return 'vendor-firebase';

              if (
                id.includes('jspdf') ||
                id.includes('html2canvas') ||
                id.includes('dompurify')
              ) return 'vendor-pdf';

              if (id.includes('lucide-react'))
                return 'vendor-icons';

              if (id.includes('nepali-date'))
                return 'vendor-dates';
            }
          },
        },
      },
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('.', import.meta.url)),
      },
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,

      // HMR disabled in AI Studio via DISABLE_HMR
      hmr: process.env.DISABLE_HMR !== 'true',

      // Disable file watching during agent edits
      watch:
        process.env.DISABLE_HMR === 'true'
          ? { ignored: ['**/*'] }
          : {},
    },
  };
});
