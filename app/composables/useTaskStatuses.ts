import { ref, reactive } from 'vue'
import type { TaskStatus, TaskStatusPagination } from '~/types'

// Estado compartilhado (singleton)
const taskStatuses = ref<TaskStatus[]>([])
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
  sort: [{ field: 'order', direction: 'asc' }]
})

export function useTaskStatuses() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de status de tarefas
   */
  const fetchTaskStatuses = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('task-statuses', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as TaskStatusPagination

      taskStatuses.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar status de tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar todos os status (sem paginação)
   */
  const fetchAllTaskStatuses = async () => {
    loading.value = true
    try {
      const response = await api.index('task-statuses', 1, {
        all: true
      }) as TaskStatus[]

      taskStatuses.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar status de tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar status por UUID
   */
  const fetchTaskStatus = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/task-statuses', uuid) as TaskStatus
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar status',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar novo status
   */
  const createTaskStatus = async (data: Partial<TaskStatus>) => {
    loading.value = true
    try {
      const response = await api.create('/task-statuses', data)
      toast.add({
        title: 'Sucesso',
        description: 'Status criado com sucesso',
        color: 'success'
      })
      await fetchTaskStatuses(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar status'
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
   * Atualizar status existente
   */
  const updateTaskStatus = async (uuid: string, data: Partial<TaskStatus>) => {
    loading.value = true
    try {
      const response = await api.update('/task-statuses', uuid, data)
      toast.add({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso',
        color: 'success'
      })
      await fetchTaskStatuses(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar status'
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
   * Excluir status
   */
  const deleteTaskStatus = async (uuid: string) => {
    loading.value = true
    try {
      await api.delete('/task-statuses', uuid)
      toast.add({
        title: 'Sucesso',
        description: 'Status excluído com sucesso',
        color: 'success'
      })
      await fetchTaskStatuses(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir status'
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
   * Excluir múltiplos status
   */
  const deleteTaskStatuses = async (uuids: string[]) => {
    loading.value = true
    try {
      await api.deleteMany('/task-statuses/batch', uuids)
      toast.add({
        title: 'Sucesso',
        description: 'Status excluídos com sucesso',
        color: 'success'
      })
      await fetchTaskStatuses(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir status'
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
   * Atualizar ordem dos status
   */
  const updateTaskStatusOrder = async (items: { uuid: string; order: number }[]) => {
    loading.value = true
    try {
      await $fetch('/api/task-statuses/order', {
        method: 'PUT',
        body: { items }
      })
      toast.add({
        title: 'Sucesso',
        description: 'Ordem atualizada com sucesso',
        color: 'success'
      })
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar ordem'
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
   * Atualizar parâmetros de busca
   */
  const setSearchParams = (params: Partial<typeof searchParams>) => {
    Object.assign(searchParams, params)
  }

  /**
   * Resetar parâmetros de busca
   */
  const resetSearchParams = () => {
    searchParams.search = {}
    searchParams.filters = []
    searchParams.sort = [{ field: 'order', direction: 'asc' }]
  }

  return {
    // Estado
    taskStatuses,
    loading,
    pagination,
    searchParams,
    
    // Métodos
    fetchTaskStatuses,
    fetchAllTaskStatuses,
    fetchTaskStatus,
    createTaskStatus,
    updateTaskStatus,
    deleteTaskStatus,
    deleteTaskStatuses,
    updateTaskStatusOrder,
    setSearchParams,
    resetSearchParams
  }
}
