import { ref, reactive, computed } from 'vue'
import type { Task, TaskPagination, TaskStatus } from '~/types'

// Estado compartilhado (singleton)
const tasks = ref<Task[]>([])
const loading = ref(false)
const pagination = reactive({
  currentPage: 1,
  lastPage: 1,
  perPage: 50,
  total: 0
})

// Parâmetros de busca
const searchParams = reactive({
  search: {},
  filters: [] as any[],
  sort: [{ field: 'order', direction: 'asc' }],
  includes: [
    { name: 'project' },
    { name: 'milestone' },
    { name: 'status' },
    { name: 'priority' },
    { name: 'type' },
    { name: 'responsible' },
    { name: 'creator' }
  ]
})

// Filtros do Kanban
const kanbanFilters = reactive({
  project_id: null as number | null,
  milestone_id: null as number | null,
  sprint_id: null as number | null,
  status_id: null as number | null,
  responsible_id: null as number | null,
  priority_id: null as number | null,
  type_id: null as number | null,
  search: '',
  overdue: false,
  blocked: false,
  due_date_start: null as string | null,
  due_date_end: null as string | null,
  sort_field: 'order' as string,
  sort_direction: 'asc' as 'asc' | 'desc'
})

export function useTasks() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de tarefas
   */
  const fetchTasks = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('tasks', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as TaskPagination

      tasks.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar tarefas para o Kanban
   */
  const fetchKanbanTasks = async () => {
    loading.value = true
    try {
      const params = new URLSearchParams()
      if (kanbanFilters.project_id) params.append('project_id', String(kanbanFilters.project_id))
      if (kanbanFilters.milestone_id) params.append('milestone_id', String(kanbanFilters.milestone_id))
      if (kanbanFilters.sprint_id) params.append('sprint_id', String(kanbanFilters.sprint_id))
      if (kanbanFilters.status_id) params.append('status_id', String(kanbanFilters.status_id))
      if (kanbanFilters.responsible_id) params.append('responsible_id', String(kanbanFilters.responsible_id))
      if (kanbanFilters.priority_id) params.append('priority_id', String(kanbanFilters.priority_id))
      if (kanbanFilters.type_id) params.append('type_id', String(kanbanFilters.type_id))
      if (kanbanFilters.overdue) params.append('overdue', '1')
      if (kanbanFilters.blocked) params.append('blocked', '1')
      if (kanbanFilters.due_date_start) params.append('due_date_start', kanbanFilters.due_date_start)
      if (kanbanFilters.due_date_end) params.append('due_date_end', kanbanFilters.due_date_end)
      if (kanbanFilters.sort_field && kanbanFilters.sort_field !== 'order') params.append('sort_field', kanbanFilters.sort_field)
      if (kanbanFilters.sort_direction && kanbanFilters.sort_direction !== 'asc') params.append('sort_direction', kanbanFilters.sort_direction)

      const queryString = params.toString()
      const url = queryString ? `/tasks/kanban?${queryString}` : '/tasks/kanban'
      const response = await api.request(url, 'GET') as Task[]

      tasks.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar tarefa por UUID
   */
  const fetchTask = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/tasks', uuid) as Task
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar tarefa',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar nova tarefa
   */
  const createTask = async (data: Partial<Task>) => {
    loading.value = true
    try {
      const response = await api.create('/tasks', data)
      toast.add({
        title: 'Sucesso',
        description: 'Tarefa criada com sucesso',
        color: 'success'
      })
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar tarefa'
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
   * Atualizar tarefa
   */
  const updateTask = async (uuid: string, data: Partial<Task>) => {
    loading.value = true
    try {
      const response = await api.update(`/tasks/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Tarefa atualizada com sucesso',
        color: 'success'
      })
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar tarefa'
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
   * Atualizar tarefa silenciosamente (sem toast de sucesso)
   */
  const updateTaskSilent = async (uuid: string, data: Partial<Task>) => {
    try {
      const response = await api.update(`/tasks/${uuid}`, data)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar tarefa'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    }
  }

  /**
   * Atualizar status da tarefa (para drag & drop)
   */
  const updateTaskStatus = async (uuid: string, statusId: number, order?: number) => {
    try {
      const response = await api.update(`/tasks/${uuid}/status`, { status_id: statusId, order }, 'PATCH')
      return response
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao atualizar status',
        color: 'error'
      })
      throw error
    }
  }

  /**
   * Atualizar ordem das tarefas
   */
  const updateTasksOrder = async (tasksData: { uuid: string; order: number; status_id?: number }[]) => {
    try {
      await api.request('/tasks/order', 'PUT', { tasks: tasksData })
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao atualizar ordem',
        color: 'error'
      })
      throw error
    }
  }

  /**
   * Excluir tarefa
   */
  const deleteTask = async (uuid: string) => {
    loading.value = true
    try {
      await api.remove(`/tasks/${uuid}`)
      toast.add({
        title: 'Sucesso',
        description: 'Tarefa excluída com sucesso',
        color: 'success'
      })
      // Remover da lista local
      tasks.value = tasks.value.filter(t => t.uuid !== uuid)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir tarefa'
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
   * Excluir múltiplas tarefas
   */
  const deleteManyTasks = async (uuids: string[]) => {
    loading.value = true
    try {
      await api.request('/tasks/batch', 'DELETE', { uuids })

      toast.add({
        title: 'Sucesso',
        description: `${uuids.length} tarefa(s) excluída(s) com sucesso`,
        color: 'success'
      })

      // Remover da lista local
      tasks.value = tasks.value.filter(t => !uuids.includes(t.uuid))
    } catch (error: any) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao excluir tarefas',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Agrupar tarefas por status
   */
  const tasksByStatus = computed(() => {
    const grouped: Record<number, Task[]> = {}
    
    for (const task of tasks.value) {
      const statusId = task.status_id || 0
      if (!grouped[statusId]) {
        grouped[statusId] = []
      }
      grouped[statusId].push(task)
    }
    
    // Ordenar tarefas dentro de cada grupo
    for (const statusId in grouped) {
      grouped[statusId]?.sort((a, b) => a.order - b.order)
    }
    
    return grouped
  })

  /**
   * Filtrar tarefas por texto
   */
  const filteredTasks = computed(() => {
    if (!kanbanFilters.search) return tasks.value
    
    const search = kanbanFilters.search.toLowerCase()
    return tasks.value.filter(task => 
      task.title.toLowerCase().includes(search) ||
      task.code.toString().includes(search) ||
      task.project?.name?.toLowerCase().includes(search)
    )
  })

  /**
   * Limpar filtros
   */
  const clearFilters = () => {
    kanbanFilters.project_id = null
    kanbanFilters.milestone_id = null
    kanbanFilters.sprint_id = null
    kanbanFilters.status_id = null
    kanbanFilters.responsible_id = null
    kanbanFilters.priority_id = null
    kanbanFilters.type_id = null
    kanbanFilters.search = ''
    kanbanFilters.overdue = false
    kanbanFilters.blocked = false
    kanbanFilters.due_date_start = null
    kanbanFilters.due_date_end = null
    kanbanFilters.sort_field = 'order'
    kanbanFilters.sort_direction = 'asc'
  }

  /**
   * Atualizar tarefa localmente (para otimistic update)
   */
  const updateTaskLocally = (uuid: string, data: Partial<Task>) => {
    const index = tasks.value.findIndex(t => t.uuid === uuid)
    if (index !== -1) {
      tasks.value[index] = { ...tasks.value[index], ...data } as Task
    }
  }

  /**
   * Adicionar tarefa localmente
   */
  const addTaskLocally = (task: Task) => {
    tasks.value.push(task)
  }

  /**
   * Remover tarefa localmente
   */
  const removeTaskLocally = (uuid: string) => {
    tasks.value = tasks.value.filter(t => t.uuid !== uuid)
  }

  return {
    // State
    tasks,
    loading,
    pagination,
    searchParams,
    kanbanFilters,
    
    // Computed
    tasksByStatus,
    filteredTasks,
    
    // Methods
    fetchTasks,
    fetchKanbanTasks,
    fetchTask,
    createTask,
    updateTask,
    updateTaskSilent,
    updateTaskStatus,
    updateTasksOrder,
    deleteTask,
    deleteManyTasks,
    clearFilters,
    updateTaskLocally,
    addTaskLocally,
    removeTaskLocally
  }
}
