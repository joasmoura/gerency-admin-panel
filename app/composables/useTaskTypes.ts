import { ref, reactive } from 'vue'
import type { TaskType, TaskTypePagination } from '~/types'

// Estado compartilhado (singleton)
const taskTypes = ref<TaskType[]>([])
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

export function useTaskTypes() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de tipos de tarefas
   */
  const fetchTaskTypes = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('task-types', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as TaskTypePagination

      taskTypes.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar tipos de tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar todos os tipos (sem paginação)
   */
  const fetchAllTaskTypes = async () => {
    loading.value = true
    try {
      const response = await api.index('task-types', 1, {
        all: true
      }) as TaskType[]

      taskTypes.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar tipos de tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar tipo por UUID
   */
  const fetchTaskType = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/task-types', uuid) as TaskType
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar tipo de tarefa',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar novo tipo de tarefa
   */
  const createTaskType = async (data: Partial<TaskType>) => {
    loading.value = true
    try {
      const response = await api.create('/task-types', data)
      toast.add({
        title: 'Sucesso',
        description: 'Tipo de tarefa criado com sucesso',
        color: 'success'
      })
      await fetchTaskTypes(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar tipo de tarefa'
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
   * Atualizar tipo de tarefa
   */
  const updateTaskType = async (uuid: string, data: Partial<TaskType>) => {
    loading.value = true
    try {
      const response = await api.update(`/task-types/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Tipo de tarefa atualizado com sucesso',
        color: 'success'
      })
      await fetchTaskTypes(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar tipo de tarefa'
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
   * Excluir tipo de tarefa
   */
  const deleteTaskType = async (uuid: string) => {
    loading.value = true
    try {
      await api.remove(`/task-types/${uuid}`)
      toast.add({
        title: 'Sucesso',
        description: 'Tipo de tarefa excluído com sucesso',
        color: 'success'
      })
      await fetchTaskTypes(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir tipo de tarefa'
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

  return {
    taskTypes,
    loading,
    pagination,
    searchParams,
    fetchTaskTypes,
    fetchAllTaskTypes,
    fetchTaskType,
    createTaskType,
    updateTaskType,
    deleteTaskType
  }
}
