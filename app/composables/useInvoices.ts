import type { Invoice, InvoicePagination, InvoiceStats, InvoiceType, InvoiceStatus, ExpenseCategory, IncomeCategory } from '~/types'

export function useInvoices() {
  const api = useApi()
  const toast = useToast()

  // Estado reativo
  const invoices = ref<Invoice[]>([])
  const loading = ref(false)
  const pagination = ref({
    currentPage: 1,
    lastPage: 1,
    perPage: 15,
    total: 0
  })

  // Categorias de Despesas
  const expenseCategories: Record<ExpenseCategory, string> = {
    utilities: 'Utilidades',
    rent: 'Aluguel',
    internet: 'Internet',
    software: 'Software/Assinaturas',
    insurance: 'Seguros',
    taxes: 'Impostos',
    payroll: 'Folha de Pagamento',
    marketing: 'Marketing',
    maintenance: 'Manutenção',
    office: 'Material de Escritório',
    transport: 'Transporte',
    equipment: 'Equipamentos',
    other: 'Outros'
  }

  // Categorias de Receitas
  const incomeCategories: Record<IncomeCategory, string> = {
    service: 'Serviço',
    product: 'Produto',
    project: 'Projeto',
    consulting: 'Consultoria',
    subscription: 'Assinatura',
    commission: 'Comissão',
    refund: 'Reembolso',
    investment: 'Investimento',
    other: 'Outros'
  }

  // Status
  const statuses: Record<InvoiceStatus, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Vencido',
    cancelled: 'Cancelado'
  }

  // Tipos
  const types: Record<InvoiceType, string> = {
    income: 'Receita',
    expense: 'Despesa'
  }

  // Buscar faturas
  async function fetchInvoices(page = 1, filters: Record<string, any> = {}) {
    loading.value = true
    try {
      // Construir filtros para o api.index
      const apiFilters: any[] = []
      
      if (filters.type) {
        apiFilters.push({ field: 'type', operator: '=', value: filters.type })
      }
      if (filters.status) {
        apiFilters.push({ field: 'status', operator: '=', value: filters.status })
      }
      if (filters.category) {
        apiFilters.push({ field: 'category', operator: '=', value: filters.category })
      }
      if (filters.month) {
        // Filtrar por mês usando scope ou filtro raw
        apiFilters.push({ field: 'due_date', operator: 'like', value: `${filters.month}%` })
      }

      const response = await api.index('invoices', page, {
        filters: apiFilters,
        sort: [{ field: 'due_date', direction: 'desc' }],
        includes: [
          { name: 'project' },
          { name: 'customer' },
          { name: 'fixedExpense' }
        ],
        per_page: pagination.value.perPage
      }) as InvoicePagination

      invoices.value = response.data
      pagination.value = {
        currentPage: response.current_page,
        lastPage: response.last_page,
        perPage: response.per_page,
        total: response.total
      }
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro ao carregar faturas',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Criar fatura
  async function createInvoice(data: Partial<Invoice>) {
    loading.value = true
    try {
      const response = await api.create('/invoices', data) as Invoice
      toast.add({
        title: 'Fatura criada',
        description: `${data.type === 'income' ? 'Receita' : 'Despesa'} "${data.name}" criada com sucesso.`,
        color: 'success'
      })
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro ao criar fatura',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Atualizar fatura
  async function updateInvoice(uuid: string, data: Partial<Invoice>) {
    loading.value = true
    try {
      const response = await api.update(`/invoices/${uuid}`, data) as Invoice
      toast.add({
        title: 'Fatura atualizada',
        description: 'As alterações foram salvas com sucesso.',
        color: 'success'
      })
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro ao atualizar fatura',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Excluir fatura
  async function deleteInvoice(uuid: string) {
    loading.value = true
    try {
      await api.remove(`/invoices/${uuid}`)
      invoices.value = invoices.value.filter(i => i.uuid !== uuid)
      toast.add({
        title: 'Fatura excluída',
        description: 'A fatura foi excluída com sucesso.',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Erro ao excluir fatura',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Excluir múltiplas faturas
  async function deleteMultipleInvoices(uuids: string[]) {
    loading.value = true
    try {
      await api.request('/invoices/batch', 'DELETE', { uuids })
      invoices.value = invoices.value.filter(i => !uuids.includes(i.uuid))
      toast.add({
        title: 'Faturas excluídas',
        description: `${uuids.length} faturas foram excluídas.`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Erro ao excluir faturas',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Marcar como pago
  async function markAsPaid(uuid: string, paymentMethod?: string) {
    loading.value = true
    try {
      const response = await api.update(`/invoices/${uuid}/mark-paid`, {
        payment_method: paymentMethod
      }, 'PATCH') as Invoice
      
      const index = invoices.value.findIndex(i => i.uuid === uuid)
      if (index !== -1) {
        invoices.value[index] = response
      }
      toast.add({
        title: 'Pagamento registrado',
        description: 'A fatura foi marcada como paga.',
        color: 'success'
      })
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro ao registrar pagamento',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Cancelar fatura
  async function cancelInvoice(uuid: string) {
    loading.value = true
    try {
      const response = await api.update(`/invoices/${uuid}/cancel`, {}, 'PATCH') as Invoice
      
      const index = invoices.value.findIndex(i => i.uuid === uuid)
      if (index !== -1) {
        invoices.value[index] = response
      }
      toast.add({
        title: 'Fatura cancelada',
        description: 'A fatura foi cancelada com sucesso.',
        color: 'success'
      })
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro ao cancelar fatura',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Buscar estatísticas
  async function fetchStats(month?: string): Promise<InvoiceStats> {
    try {
      const params = month ? { month } : {}
      return await api.request('/invoices/stats', 'GET', params) as InvoiceStats
    } catch (error: any) {
      toast.add({
        title: 'Erro ao carregar estatísticas',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    }
  }

  // Gerar faturas a partir das despesas fixas
  async function generateFromFixed(month?: string) {
    loading.value = true
    try {
      const data = month ? { month } : {}
      const response = await api.create('/invoices/generate-from-fixed', data) as {
        generated: Invoice[]
        generated_count: number
        skipped: string[]
        skipped_count: number
      }
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro ao gerar faturas',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  // Atualizar status de vencidas
  async function updateOverdueStatus() {
    try {
      const response = await api.create('/invoices/update-overdue', {}) as { updated: number }
      return response.updated
    } catch (error: any) {
      toast.add({
        title: 'Erro ao atualizar status',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    }
  }

  // Buscar detalhamento por categoria
  async function fetchCategoryBreakdown(month?: string, type: InvoiceType = 'expense') {
    try {
      const params: Record<string, string> = { type }
      if (month) params.month = month
      
      return await api.request('/invoices/category-breakdown', 'GET', params) as Array<{
        category: string
        label: string
        total: number
        count: number
      }>
    } catch (error: any) {
      toast.add({
        title: 'Erro ao carregar detalhamento',
        description: error?.data?.message || 'Erro desconhecido',
        color: 'error'
      })
      throw error
    }
  }

  // Helper para formatar moeda
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value)
  }

  // Helper para label de status
  function getStatusLabel(status: InvoiceStatus): string {
    return statuses[status] || status
  }

  // Helper para label de tipo
  function getTypeLabel(type: InvoiceType): string {
    return types[type] || type
  }

  // Helper para label de categoria
  function getCategoryLabel(category: string, type: InvoiceType = 'expense'): string {
    if (type === 'income') {
      return incomeCategories[category as IncomeCategory] || category
    }
    return expenseCategories[category as ExpenseCategory] || category
  }

  // Helper para cor de status
  function getStatusColor(status: InvoiceStatus): string {
    const colors: Record<InvoiceStatus, string> = {
      pending: 'warning',
      paid: 'success',
      overdue: 'error',
      cancelled: 'neutral'
    }
    return colors[status] || 'neutral'
  }

  // Helper para cor de tipo
  function getTypeColor(type: InvoiceType): string {
    return type === 'income' ? 'success' : 'error'
  }

  return {
    // Estado
    invoices,
    loading,
    pagination,
    
    // Constantes
    expenseCategories,
    incomeCategories,
    statuses,
    types,
    
    // Métodos
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    deleteMultipleInvoices,
    markAsPaid,
    cancelInvoice,
    fetchStats,
    generateFromFixed,
    updateOverdueStatus,
    fetchCategoryBreakdown,
    
    // Helpers
    formatCurrency,
    getStatusLabel,
    getTypeLabel,
    getCategoryLabel,
    getStatusColor,
    getTypeColor
  }
}
