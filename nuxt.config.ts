export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  modules: ['@nuxthub/core', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/tailwind.css'],
  components: [{ path: '~/components', extensions: ['vue'] }],
  tailwindcss: { cssPath: '~/assets/css/tailwind.css' },
  app: { head: { htmlAttrs: { lang: 'es' }, title: 'Limpieza · Kitchen Tracker', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }, { name: 'theme-color', content: '#f7f5f0' }] } },
  hub: {
    db: process.env.NODE_ENV === 'production'
      ? { dialect: 'sqlite', driver: 'd1', connection: { databaseId: process.env.NUXT_HUB_CLOUDFLARE_DATABASE_ID } }
      : { dialect: 'sqlite', driver: 'libsql', connection: { url: 'file:.data/db/sqlite.db' } }
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
