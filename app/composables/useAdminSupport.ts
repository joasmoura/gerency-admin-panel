import type { AdminSupportTicket, AdminSupportDashboard } from '~/types/support'

export function useAdminSupport() {
  const { show, request, create, update, loading, error } = useApi()
  const toast = useToast()

  const tickets = ref<AdminSupportTicket[]>([])
  const currentTicket = ref<AdminSupportTicket | null>(null)
  const dashboard = ref<AdminSupportDashboard | null>(null)
  const admins = ref<{ id: number; name: string; email: string; avatar_url: string | null }[]>([])
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  })

  // Buscar tickets
  async function fetchTickets(page: number = 1, filters?: Record<string, any>) {
    try {
      const params = new URLSearchParams({ page: String(page) })
      
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status)
      if (filters?.category && filters.category !== 'all') params.append('category', filters.category)
      if (filters?.priority && filters.priority !== 'all') params.append('priority', filters.priority)
      if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to)
      if (filters?.search) params.append('search', filters.search)
      if (filters?.date_from) params.append('date_from', filters.date_from)
      if (filters?.date_to) params.append('date_to', filters.date_to)
      if (filters?.sort_by) params.append('sort_by', filters.sort_by)
      if (filters?.sort_order) params.append('sort_order', filters.sort_order)

      const response = await request(`/admin/support?${params.toString()}`, 'GET')
      tickets.value = response.data
      pagination.value = {
        current_page: response.current_page,
        last_page: response.last_page,
        per_page: response.per_page,
        total: response.total
      }
      return response
    } catch (err: any) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível carregar os tickets',
        color: 'error'
      })
      throw err
    }
  }

  // Buscar ticket específico
  async function fetchTicket(uuid: string) {
    try {
      const response = await show(`/admin/support`, uuid)
      currentTicket.value = response
      return response
    } catch (err: any) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível carregar o ticket',
        color: 'error'
      })
      throw err
    }
  }

  // Atualizar ticket
  async function updateTicket(uuid: string, data: {
    status?: string
    priority?: string
    assigned_to?: number | null
    category?: string
  }) {
    try {
      const response = await update(`/admin/support/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Ticket atualizado com sucesso',
        color: 'success'
      })
      return response.ticket
    } catch (err: any) {
      toast.add({
        title: 'Erro',
        description: err?.data?.message || 'Não foi possível atualizar o ticket',
        color: 'error'
      })
      throw err
    }
  }

  // Adicionar resposta
  async function addResponse(ticketUuid: string, message: string, isInternalNote: boolean = false) {
    try {
      const response = await create(`/admin/support/${ticketUuid}/response`, {
        message,
        is_internal_note: isInternalNote
      })
      if (currentTicket.value && currentTicket.value.uuid === ticketUuid) {
        currentTicket.value.messages.push(response.data)
      }
      return response.data
    } catch (err: any) {
      toast.add({
        title: 'Erro',
        description: err?.data?.message || 'Não foi possível enviar a resposta',
        color: 'error'
      })
      throw err
    }
  }

  // Buscar dashboard
  async function fetchDashboard(period: number = 30) {
    try {
      const response = await request(`/admin/support/dashboard?period=${period}`, 'GET')
      dashboard.value = response
      return response
    } catch (err: any) {
      console.error('Erro ao buscar dashboard:', err)
      throw err
    }
  }

  // Buscar admins
  async function fetchAdmins() {
    try {
      const response = await request('/admin/support/admins', 'GET')
      admins.value = response
      return response
    } catch (err: any) {
      console.error('Erro ao buscar admins:', err)
      throw err
    }
  }

  // Bulk update
  async function bulkUpdate(ticketIds: string[], action: string, value: any) {
    try {
      const response = await create('/admin/support/bulk-update', {
        ticket_ids: ticketIds,
        action,
        value
      })
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      return response
    } catch (err: any) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível atualizar os tickets',
        color: 'error'
      })
      throw err
    }
  }

  return {
    tickets,
    currentTicket,
    dashboard,
    admins,
    pagination,
    loading,
    error,
    fetchTickets,
    fetchTicket,
    updateTicket,
    addResponse,
    fetchDashboard,
    fetchAdmins,
    bulkUpdate
  }
}
