import { ref, reactive } from 'vue'
import type { FixedExpense, FixedExpensePagination, ExpenseCategory } from '~/types'

// Estado compartilhado (singleton)
const fixedExpenses = ref<FixedExpense[]>([])
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
  sort: [{ field: 'name', direction: 'asc' }],
  includes: []
})

// Categorias de despesas
const categories: Record<ExpenseCategory, string> = {
  utilities: 'Utilidades (Água, Luz, Gás)',
  rent: 'Aluguel',
  internet: 'Internet/Telefone',
  software: 'Software/Assinaturas',
  insurance: 'Seguros',
  taxes: 'Impostos',
  payroll: 'Folha de Pagamento',
  marketing: 'Marketing',
  maintenance: 'Manutenção',
  office: 'Material de Escritório',
  transport: 'Transporte',
  equipment: 'Equipamentos',
  other: 'Outros',
}

export function useFixedExpenses() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de despesas fixas
   */
  const fetchFixedExpenses = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('fixed-expenses', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as FixedExpensePagination

      fixedExpenses.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar despesas fixas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar despesa fixa por UUID
   */
  const fetchFixedExpense = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/fixed-expenses', uuid) as FixedExpense
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar despesa fixa',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar nova despesa fixa
   */
  const createFixedExpense = async (data: Partial<FixedExpense>) => {
    loading.value = true
    try {
      const response = await api.create('/fixed-expenses', data)
      toast.add({
        title: 'Sucesso',
        description: 'Despesa fixa criada com sucesso',
        color: 'success'
      })
      await fetchFixedExpenses(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar despesa fixa'
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
   * Atualizar despesa fixa
   */
  const updateFixedExpense = async (uuid: string, data: Partial<FixedExpense>) => {
    loading.value = true
    try {
      const response = await api.update(`/fixed-expenses/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Despesa fixa atualizada com sucesso',
        color: 'success'
      })
      await fetchFixedExpenses(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar despesa fixa'
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
   * Excluir despesa fixa
   */
  const deleteFixedExpense = async (uuid: string) => {
    loading.value = true
    try {
      await api.remove(`/fixed-expenses/${uuid}`)
      toast.add({
        title: 'Sucesso',
        description: 'Despesa fixa excluída com sucesso',
        color: 'success'
      })
      await fetchFixedExpenses(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir despesa fixa'
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
   * Excluir múltiplas despesas fixas
   */
  const deleteMultipleFixedExpenses = async (uuids: string[]) => {
    loading.value = true
    try {
      await api.request('/fixed-expenses/batch', 'DELETE', { uuids })
      toast.add({
        title: 'Sucesso',
        description: `${uuids.length} despesa(s) fixa(s) excluída(s) com sucesso`,
        color: 'success'
      })
      await fetchFixedExpenses(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir despesas fixas'
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
   * Alternar status ativo/inativo
   */
  const toggleActive = async (uuid: string) => {
    try {
      const response = await api.request(`/fixed-expenses/${uuid}/toggle-active`, 'PATCH')
      toast.add({
        title: 'Sucesso',
        description: (response as any).message,
        color: 'success'
      })
      await fetchFixedExpenses(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao alterar status'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    }
  }

  /**
   * Obter label da categoria
   */
  const getCategoryLabel = (category: ExpenseCategory | undefined): string => {
    if (!category) return '-'
    return categories[category] || category
  }

  return {
    // Estado
    fixedExpenses,
    loading,
    pagination,
    searchParams,
    categories,

    // Métodos
    fetchFixedExpenses,
    fetchFixedExpense,
    createFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    deleteMultipleFixedExpenses,
    toggleActive,
    getCategoryLabel,
  }
}
