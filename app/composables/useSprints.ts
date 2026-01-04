import { ref, reactive, computed } from 'vue'
import type { Sprint, SprintPagination, Task, SprintStatus } from '~/types'

// Estado compartilhado (singleton)
const sprints = ref<Sprint[]>([])
const currentSprint = ref<Sprint | null>(null)
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
  sort: [{ field: 'order', direction: 'asc' }],
  includes: []
})

export function useSprints() {
  const api = useApi()
  const toast = useToast()

  // Status options
  const statusOptions = [
    { label: 'Planejamento', value: 'planning', color: 'gray', icon: 'i-lucide-edit-3' },
    { label: 'Ativo', value: 'active', color: 'blue', icon: 'i-lucide-play' },
    { label: 'Concluído', value: 'completed', color: 'green', icon: 'i-lucide-check-circle' },
    { label: 'Cancelado', value: 'cancelled', color: 'red', icon: 'i-lucide-x-circle' }
  ]

  const getStatusOption = (status: SprintStatus) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0]
  }

  /**
   * Buscar lista de sprints
   */
  const fetchSprints = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('sprints', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as SprintPagination

      sprints.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar sprints',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar todas as sprints (sem paginação)
   */
  const fetchAllSprints = async () => {
    loading.value = true
    try {
      const response = await api.index('sprints', 1, {
        all: true
      }) as Sprint[]

      sprints.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar sprints',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar sprint por UUID
   */
  const fetchSprint = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/sprints', uuid) as Sprint
      currentSprint.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar sprint',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar nova sprint
   */
  const createSprint = async (data: Partial<Sprint>) => {
    loading.value = true
    try {
      const response = await api.create('/sprints', data) as { message: string; data: Sprint }
      sprints.value.unshift(response.data)
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      return response.data
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao criar sprint',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Atualizar sprint
   */
  const updateSprint = async (uuid: string, data: Partial<Sprint>) => {
    loading.value = true
    try {
      const response = await api.update(`/sprints/${uuid}`, data) as { message: string; data: Sprint }
      const index = sprints.value.findIndex(s => s.uuid === uuid)
      if (index !== -1) {
        sprints.value[index] = response.data
      }
      if (currentSprint.value?.uuid === uuid) {
        currentSprint.value = response.data
      }
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      return response.data
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao atualizar sprint',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Excluir sprint
   */
  const deleteSprint = async (uuid: string) => {
    loading.value = true
    try {
      await api.remove(`/sprints/${uuid}`)
      sprints.value = sprints.value.filter(s => s.uuid !== uuid)
      toast.add({
        title: 'Sucesso',
        description: 'Sprint excluída com sucesso',
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir sprint',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Excluir múltiplas sprints
   */
  const deleteSprints = async (uuids: string[]) => {
    loading.value = true
    try {
      await api.request('/sprints/batch', 'DELETE', { uuids })
      sprints.value = sprints.value.filter(s => !uuids.includes(s.uuid))
      toast.add({
        title: 'Sucesso',
        description: `${uuids.length} sprint(s) excluída(s) com sucesso`,
        color: 'success'
      })
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao excluir sprints',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Iniciar sprint
   */
  const startSprint = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.update(`/sprints/${uuid}/start`, {}, 'PATCH') as { message: string; data: Sprint }
      const index = sprints.value.findIndex(s => s.uuid === uuid)
      if (index !== -1) {
        sprints.value[index] = response.data
      }
      if (currentSprint.value?.uuid === uuid) {
        currentSprint.value = response.data
      }
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      return response.data
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao iniciar sprint',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Concluir sprint
   */
  const completeSprint = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.update(`/sprints/${uuid}/complete`, {}, 'PATCH') as { message: string; data: Sprint }
      const index = sprints.value.findIndex(s => s.uuid === uuid)
      if (index !== -1) {
        sprints.value[index] = response.data
      }
      if (currentSprint.value?.uuid === uuid) {
        currentSprint.value = response.data
      }
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      return response.data
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao concluir sprint',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Adicionar tarefas à sprint
   */
  const addTasksToSprint = async (sprintUuid: string, taskUuids: string[]) => {
    loading.value = true
    try {
      const response = await api.create(`/sprints/${sprintUuid}/tasks`, { task_uuids: taskUuids }) as { message: string }
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      // Recarregar sprint se for a atual
      if (currentSprint.value?.uuid === sprintUuid) {
        await fetchSprint(sprintUuid)
      }
      return true
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao adicionar tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Remover tarefas da sprint
   */
  const removeTasksFromSprint = async (sprintUuid: string, taskUuids: string[]) => {
    loading.value = true
    try {
      const response = await api.request(`/sprints/${sprintUuid}/tasks`, 'DELETE', { task_uuids: taskUuids }) as { message: string }
      toast.add({
        title: 'Sucesso',
        description: response.message,
        color: 'success'
      })
      // Recarregar sprint se for a atual
      if (currentSprint.value?.uuid === sprintUuid) {
        await fetchSprint(sprintUuid)
      }
      return true
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao remover tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar backlog (tarefas sem sprint)
   */
  const fetchBacklog = async () => {
    try {
      const params: any = { exclude_completed: true }
      const response = await api.request('/sprints/backlog', 'GET', params) as Task[]
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: error.response?.data?.message || 'Erro ao carregar backlog',
        color: 'error'
      })
      throw error
    }
  }

  /**
   * Calcular progresso da sprint
   */
  const getSprintProgress = (sprint: Sprint): number => {
    const total = sprint.tasks_count || 0
    const completed = sprint.completed_tasks_count || 0
    if (total === 0) return 0
    return Math.round((completed / total) * 100) || 0
  }

  /**
   * Verificar se a sprint está atrasada
   */
  const isSprintOverdue = (sprint: Sprint): boolean => {
    if (!sprint.end_date || sprint.status === 'completed') return false
    return new Date(sprint.end_date) < new Date()
  }

  /**
   * Calcular dias restantes
   */
  const getDaysRemaining = (sprint: Sprint): number | null => {
    if (!sprint.end_date || sprint.status === 'completed') return null
    const endDate = new Date(sprint.end_date)
    const today = new Date()
    const diffTime = endDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Atualizar filtros
   */
  const setFilters = (filters: any[]) => {
    searchParams.filters = filters
  }

  /**
   * Limpar filtros
   */
  const clearFilters = () => {
    searchParams.filters = []
    searchParams.search = {}
  }

  return {
    // State
    sprints,
    currentSprint,
    loading,
    pagination,
    searchParams,
    
    // Status helpers
    statusOptions,
    getStatusOption,
    
    // Methods
    fetchSprints,
    fetchAllSprints,
    fetchSprint,
    createSprint,
    updateSprint,
    deleteSprint,
    deleteSprints,
    startSprint,
    completeSprint,
    addTasksToSprint,
    removeTasksFromSprint,
    fetchBacklog,
    
    // Helpers
    getSprintProgress,
    isSprintOverdue,
    getDaysRemaining,
    setFilters,
    clearFilters
  }
}
