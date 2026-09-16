export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxthub/core', '@nuxtjs/tailwindcss', '@nuxtjs/i18n', 'evlog/nuxt'],
  i18n: {
    defaultLocale: 'en',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    locales: [{ code: 'en', language: 'en', name: 'English', file: 'en.json' }]
  },
  evlog: {
    env: { service: 'kitchen-tracker' },
    include: ['/api/**'],
    exclude: ['/api/_evlog/**'],
    transport: { enabled: true },
    minLevel: 'info',
    redact: { paths: ['pin', '*secret*', 'cookie', 'authorization', 'by', 'body'] },
    sampling: {
      rates: { info: 10, warn: 100, error: 100, debug: 0 },
      keep: [{ status: 400 }, { duration: 1000 }, { path: '/api/cleaning/complete' }, { path: '/api/cleaning/undo' }]
    }
  },
  css: ['~/assets/css/tailwind.css'],
  components: [{ path: '~/components', extensions: ['vue'] }],
  tailwindcss: { cssPath: '~/assets/css/tailwind.css' },
  app: { head: {
    htmlAttrs: { lang: 'en' },
    title: 'Kitchen Tracker',
    meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }, { name: 'theme-color', content: '#f7f5f0' }],
    link: [
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'apple-touch-icon', href: '/kitchen-tracker-icon.png' }
    ]
  } },
  routeRules: {
    '/semanal': { redirect: '/weekly' },
    '/profunda': { redirect: '/deep' },
    '/perfil': { redirect: '/profile' }
  },
  nitro: {
    preset: 'cloudflare_module',
    cloudflare: {
      wrangler: { name: 'kitchen-tracker' }
    }
  },
  runtimeConfig: {
    cleaningPin: process.env.NUXT_CLEANING_PIN || '2828',
    sessionSecret: process.env.NUXT_SESSION_SECRET || 'kitchen-tracker-poc-session-secret',
    public: { appName: 'Kitchen Tracker' }
  }
})
