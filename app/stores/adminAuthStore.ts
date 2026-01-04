import { defineStore } from 'pinia';

export interface AdminUser {
  id: number;
  uuid: string;
  name: string;
  email: string;
  is_admin: boolean;
}

interface AdminAuthState {
  user: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const useAdminAuthStore = defineStore('adminAuth', {
  state: (): AdminAuthState => ({
    user: null,
    token: null,
    isAuthenticated: false,
  }),

  getters: {
    /**
     * Retorna o usuário autenticado
     */
    getUser: (state) => state.user,
    
    /**
     * Retorna o token de autenticação
     */
    getToken: (state) => state.token,
    
    /**
     * Verifica se o usuário está logado
     */
    isLoggedIn: (state) => state.isAuthenticated && !!state.token && !!state.user,
    
    /**
     * Verifica se o usuário é administrador
     */
    isAdmin: (state) => state.user?.is_admin ?? false,
    
    /**
     * Retorna o nome do usuário ou um valor padrão
     */
    userName: (state) => state.user?.name ?? 'Administrador',
    
    /**
     * Retorna o email do usuário
     */
    userEmail: (state) => state.user?.email ?? '',
  },

  actions: {
    /**
     * Define a autenticação do administrador
     */
    setAuth(user: AdminUser, token: string) {
      this.user = user;
      this.token = token;
      this.isAuthenticated = true;
    },

    /**
     * Atualiza os dados do usuário mantendo o token
     */
    updateUser(user: AdminUser) {
      this.user = user;
    },

    /**
     * Atualiza apenas o token
     */
    setToken(token: string) {
      this.token = token;
    },

    /**
     * Realiza o logout limpando todos os dados
     */
    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
    },

    /**
     * Limpa todos os dados do store
     */
    clear() {
      this.$reset();
    },
  },

  // Usa o plugin pinia-plugin-persistedstate configurado no nuxt.config
  persist: {
    key: 'admin-auth',
    pick: ['user', 'token', 'isAuthenticated'],
  },
});
