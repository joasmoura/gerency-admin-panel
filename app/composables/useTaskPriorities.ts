import { ref, reactive } from 'vue'
import type { TaskPriority, TaskPriorityPagination } from '~/types'

// Estado compartilhado (singleton)
const taskPriorities = ref<TaskPriority[]>([])
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

export function useTaskPriorities() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de prioridades de tarefas
   */
  const fetchTaskPriorities = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('task-priorities', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as TaskPriorityPagination

      taskPriorities.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar prioridades de tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar todas as prioridades (sem paginação)
   */
  const fetchAllTaskPriorities = async () => {
    loading.value = true
    try {
      const response = await api.index('task-priorities', 1, {
        all: true
      }) as TaskPriority[]

      taskPriorities.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar prioridades de tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar prioridade por UUID
   */
  const fetchTaskPriority = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/task-priorities', uuid) as TaskPriority
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar prioridade',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar nova prioridade
   */
  const createTaskPriority = async (data: Partial<TaskPriority>) => {
    loading.value = true
    try {
      const response = await api.create('/task-priorities', data)
      toast.add({
        title: 'Sucesso',
        description: 'Prioridade criada com sucesso',
        color: 'success'
      })
      await fetchTaskPriorities(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar prioridade'
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
   * Atualizar prioridade existente
   */
  const updateTaskPriority = async (uuid: string, data: Partial<TaskPriority>) => {
    loading.value = true
    try {
      const response = await api.update('/task-priorities', uuid, data)
      toast.add({
        title: 'Sucesso',
        description: 'Prioridade atualizada com sucesso',
        color: 'success'
      })
      await fetchTaskPriorities(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar prioridade'
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
   * Excluir prioridade
   */
  const deleteTaskPriority = async (uuid: string) => {
    loading.value = true
    try {
      await api.delete('/task-priorities', uuid)
      toast.add({
        title: 'Sucesso',
        description: 'Prioridade excluída com sucesso',
        color: 'success'
      })
      await fetchTaskPriorities(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir prioridade'
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
   * Excluir múltiplas prioridades
   */
  const deleteTaskPriorities = async (uuids: string[]) => {
    loading.value = true
    try {
      await api.deleteMany('/task-priorities/batch', uuids)
      toast.add({
        title: 'Sucesso',
        description: 'Prioridades excluídas com sucesso',
        color: 'success'
      })
      await fetchTaskPriorities(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir prioridades'
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
   * Atualizar ordem das prioridades
   */
  const updateTaskPriorityOrder = async (items: { uuid: string; order: number }[]) => {
    loading.value = true
    try {
      await $fetch('/api/task-priorities/order', {
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
    taskPriorities,
    loading,
    pagination,
    searchParams,
    
    // Métodos
    fetchTaskPriorities,
    fetchAllTaskPriorities,
    fetchTaskPriority,
    createTaskPriority,
    updateTaskPriority,
    deleteTaskPriority,
    deleteTaskPriorities,
    updateTaskPriorityOrder,
    setSearchParams,
    resetSearchParams
  }
}
