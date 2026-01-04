import { ref, reactive } from 'vue'
import type { Customer, CustomerPagination } from '~/types'

// Estado compartilhado (singleton)
const customers = ref<Customer[]>([])
const loading = ref(false)
const pagination = reactive({
  currentPage: 1,
  lastPage: 1,
  perPage: 15,
  total: 0
})

// Parâmetros de busca
const searchParams = reactive({
  search: {},
  filters: [] as any[],
  sort: [{ field: 'created_at', direction: 'desc' }]
})

export function useCustomers() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de clientes
   */
  const fetchCustomers = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('customers', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as CustomerPagination

      customers.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar clientes',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar cliente por UUID
   */
  const fetchCustomer = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/customers', uuid) as Customer
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar cliente',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar novo cliente
   */
  const createCustomer = async (data: Partial<Customer>) => {
    loading.value = true
    try {
      const response = await api.create('/customers', data)
      toast.add({
        title: 'Sucesso',
        description: 'Cliente criado com sucesso',
        color: 'success'
      })
      await fetchCustomers(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar cliente'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Atualizar cliente
   */
  const updateCustomer = async (uuid: string, data: Partial<Customer>) => {
    loading.value = true
    try {
      const response = await api.update(`/customers/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Cliente atualizado com sucesso',
        color: 'success'
      })
      await fetchCustomers(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar cliente'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Excluir cliente
   */
  const deleteCustomer = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.remove(`/customers/${uuid}`)
      toast.add({
        title: 'Sucesso',
        description: 'Cliente excluído com sucesso',
        color: 'success'
      })
      await fetchCustomers(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir cliente'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Excluir múltiplos clientes
   */
  const deleteCustomers = async (uuids: string[]) => {
    loading.value = true
    try {
      const response = await api.request('/customers/batch', 'DELETE', { uuids })
      toast.add({
        title: 'Sucesso',
        description: `${uuids.length} cliente(s) excluído(s) com sucesso`,
        color: 'success'
      })
      await fetchCustomers(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir clientes'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Definir filtros de busca
   */
  const setFilters = (filters: any[]) => {
    searchParams.filters = filters
  }

  /**
   * Definir ordenação
   */
  const setSort = (sort: { field: string; direction: 'asc' | 'desc' }[]) => {
    searchParams.sort = sort
  }

  /**
   * Definir busca
   */
  const setSearch = (search: Record<string, any>) => {
    searchParams.search = search
  }

  return {
    // Estado
    customers,
    loading,
    pagination,
    searchParams,

    // Métodos
    fetchCustomers,
    fetchCustomer,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    deleteCustomers,
    setFilters,
    setSort,
    setSearch
  }
}

export default useCustomers
