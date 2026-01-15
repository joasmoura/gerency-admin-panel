import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAdminAuthStore } from '#imports';

export function useApi() {
  // Estado compartilhado
  const loading = ref(false);
  const status = ref<number | null>(null);
  const data = ref<any>(null);
  const error = ref<any>(null);
  const auth = useAdminAuthStore();

  // Pega a base URL do runtime config
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase;

  // Função para buscar registros
  const index = async (baseModule: string, page?: any, params?: any) => {
    loading.value = true;

    let endpoint = `${baseURL}/${baseModule}/search`

    // Set default params if not provided
    const bodyParams = {
      scopes: params?.scopes ?? [],
      filters: params?.filters ?? [],
      filter_type: params?.filter_type ?? 'and',
      search: params?.search ?? {},
      sort: params?.sort ?? [{ field: "id", direction: "desc" }],
      aggregates: params?.aggregates ?? [],
      includes: params?.includes ?? [],
      page: page ?? 1,
      per_page: params?.per_page ?? 15,
      ...params
    };

    try {
      const responseData = await $fetch(endpoint, {
        method: 'POST',
        body: bodyParams,
        headers: useAuthHeaders(),
      });

      return responseData
    } catch (err) {
      error.value = err;
      console.error('Erro ao listar os registros:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Função para criar um registro
  const create = async (endpoint: string, record: any) => {
    loading.value = true;
    try {
      const headers = useAuthHeaders();

      // Se o record contém arquivos, use FormData
      let body = record;
      if (record instanceof FormData) {
        // Para FormData, não definimos Content-Type (deixamos o browser definir)
        delete headers['Content-Type'];
      }

      const responseData = await $fetch(`${baseURL}${endpoint}`, {
        method: 'POST',
        body: body,
        headers: headers,
      });

      return responseData;
    } catch (err) {
      error.value = err;
      console.error('Erro ao criar registro:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Função para buscar um registro específico
  const show = async (endpoint: string, recordId: any) => {
    loading.value = true;
    try {
      const responseData = await $fetch(`${baseURL}${endpoint}/${recordId}`, {
        headers: useAuthHeaders(),
      });

      return responseData;
    } catch (err) {
      error.value = err;
      console.error('Erro ao buscar registro:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Função para editar um registro
  const update = async (endpoint: string, record: any, method: 'PUT' | 'PATCH' = 'PUT') => {
    loading.value = true;
    try {
      const responseData = await $fetch(`${baseURL}${endpoint}`, {
        method: method,
        body: record,
        headers: useAuthHeaders(),
      });

      return responseData
    } catch (err) {
      error.value = err;
      console.error('Erro ao editar registro:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Função para excluir um registro
  const remove = async (endpoint: string) => {
    loading.value = true;
    try {
      const responseData = await $fetch(`${baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: useAuthHeaders(),
      });

      return responseData
    } catch (err) {
      error.value = err;
      console.error('Erro ao excluir registro:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const request = async (endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', params: any = {}) => {
    loading.value = true;
    try {

      const fetchOptions: any = {
        method: method,
        headers: useAuthHeaders(),
      };

      if (method !== 'GET') {
        fetchOptions.body = JSON.stringify(params);
      }

      if (method === 'GET' && params && Object.keys(params).length > 0) {
        endpoint += `?${new URLSearchParams(params).toString()}`;
      }

      const responseData = await $fetch(`${baseURL}${endpoint}`, fetchOptions);

      return responseData;
    }
    catch (err) {
      error.value = err;
      console.error('Erro ao fazer a requisição:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Função para adicionar headers de autenticação
  const useAuthHeaders = () => {
    //const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const token = auth.token;
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  return {
    index,
    create,
    show,
    update,
    remove,
    request,

    loading,
    status,
    data,
    error,
  };
}

export default useApi;
