// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxthub/core', '@nuxtjs/tailwindcss'],
  hub: {
    database: true
  },
  nitro: {
    preset: 'cloudflare-pages'
  },
  runtimeConfig: {
    public: {
      appName: 'NuxtHub app'
    }
  }
})
