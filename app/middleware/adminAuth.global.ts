import { useAdminAuthStore } from '~/stores/adminAuthStore';

/**
 * Middleware de autenticação para a área de administração do sistema.
 * 
 * Este middleware protege todas as rotas que começam com /,
 * exceto a página de login do admin.
 */
export default defineNuxtRouteMiddleware(async (to, from) => {

  // Permite acesso à página de login sem autenticação
  if (to.path === '/login') {
    return;
  }

  const adminStore = useAdminAuthStore();
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase;

  // Verifica se está autenticado
  if (!adminStore.isLoggedIn) {
    return navigateTo('/login');
  }

  // Valida o token com o backend
  try {
    const response = await $fetch<{ data: any }>(`${baseURL}/admin/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminStore.token}`,
        'Content-Type': 'application/json',
      },
    });

    // Atualiza os dados do usuário
    if (response.data) {
      adminStore.updateUser(response.data);
    }

    // Verifica se o usuário ainda é admin
    if (!response.data?.is_admin) {
      const toast = useToast();
      toast.add({
        title: 'Acesso negado',
        description: 'Você não tem permissão para acessar esta área.',
        icon: 'i-lucide-shield-x',
        color: 'error',
      });
      
      adminStore.logout();
      return navigateTo('/login');
    }

    return;
  } catch (error: any) {
    console.error('Admin auth error:', error);

    const toast = useToast();
    
    // Se o token for inválido ou expirado
    if (error.status === 401 || error.statusCode === 401) {
      toast.add({
        title: 'Sessão expirada',
        description: 'Sua sessão expirou. Faça login novamente.',
        icon: 'i-lucide-clock',
        color: 'warning',
      });
    } else {
      toast.add({
        title: 'Erro de autenticação',
        description: 'Não foi possível verificar suas credenciais.',
        icon: 'i-lucide-triangle-alert',
        color: 'error',
      });
    }

    adminStore.logout();
    return navigateTo('/login');
  }
});
