import { defineStore } from 'pinia'

export const AuthStore = defineStore('auth', {
  state: () => ({
    token: '',
    user: null as null | Record<string, any>,
    selectedTenant: null as null | Record<string, any>,
  }),
  actions: {
    setToken(token: string) {
      this.token = token
    },
    setUser(user: Record<string, any>) {
      this.user = user
    },
    setSelectedTenant(tenant: Record<string, any>) {
      this.selectedTenant = tenant
    },
    clear() {
      this.token = ''
      this.user = null
      this.selectedTenant = null
    },
    logout() {
      this.clear()
      navigateTo('/auth/login')
    },
  },
  getters: {
    isAuthenticated: (state) => !!state.token && state.user !== null,
    getUser: (state) => state.user,
    getToken: (state) => state.token,
    getTenants: (state) => state.user?.tenants || [],
    getSelectedTenant: (state) => state.selectedTenant || (state.user?.tenants ? state.user.tenants[0] : null),
  },
  persist: true,
})