// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    // '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt'
  ],
  i18n: {
    defaultLocale: 'ptBR',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'ptBR', name: 'Português', file: 'ptBR.json' }
    ]
  },
  plugins: [
    { src: '~/plugins/QuillEditor.client', mode: 'client' }
  ],

  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE,
      adminAppUrl: process.env.ADMIN_APP_URL || 'http://localhost:3000',
    }
  },

  // eslint: {
  //   config: {
  //     stylistic: {
  //       commaDangle: 'never',
  //       braceStyle: '1tbs'
  //     }
  //   }
  // }
})