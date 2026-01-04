import { ref, computed } from 'vue'
import type { TaskActivity, TaskActivityPagination, TaskActivityStats, TaskActivityAction } from '~/types'

export function useTaskActivities() {
  const api = useApi()
  const toast = useToast()

  const activities = ref<TaskActivity[]>([])
  const loading = ref(false)
  const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 20,
    total: 0
  })

  // Action labels in Portuguese
  const actionLabels: Record<TaskActivityAction, string> = {
    'created': 'Criou a tarefa',
    'updated': 'Atualizou a tarefa',
    'deleted': 'Excluiu a tarefa',
    'status_changed': 'Alterou o status',
    'assigned': 'Atribuiu a tarefa',
    'unassigned': 'Removeu atribuição',
    'commented': 'Comentou',
    'comment_edited': 'Editou comentário',
    'comment_deleted': 'Excluiu comentário',
    'mentioned': 'Mencionou',
    'checklist_added': 'Adicionou item na checklist',
    'checklist_completed': 'Completou item da checklist',
    'checklist_uncompleted': 'Desmarcou item da checklist',
    'checklist_deleted': 'Removeu item da checklist',
    'blocker_added': 'Adicionou impedimento',
    'blocker_removed': 'Removeu impedimento',
    'priority_changed': 'Alterou a prioridade',
    'type_changed': 'Alterou o tipo',
    'due_date_changed': 'Alterou a data de entrega',
    'project_changed': 'Alterou o projeto',
    'milestone_changed': 'Alterou o marco',
    'blocked': 'Bloqueou a tarefa',
    'unblocked': 'Desbloqueou a tarefa',
    'completed': 'Concluiu a tarefa',
    'reopened': 'Reabriu a tarefa'
  }

  // Action icons
  const actionIcons: Record<TaskActivityAction, string> = {
    'created': 'i-heroicons-plus-circle',
    'updated': 'i-heroicons-pencil-square',
    'deleted': 'i-heroicons-trash',
    'status_changed': 'i-heroicons-arrow-path',
    'assigned': 'i-heroicons-user-plus',
    'unassigned': 'i-heroicons-user-minus',
    'commented': 'i-heroicons-chat-bubble-left-ellipsis',
    'comment_edited': 'i-heroicons-pencil',
    'comment_deleted': 'i-heroicons-chat-bubble-left',
    'mentioned': 'i-heroicons-at-symbol',
    'checklist_added': 'i-heroicons-list-bullet',
    'checklist_completed': 'i-heroicons-check-circle',
    'checklist_uncompleted': 'i-heroicons-x-circle',
    'checklist_deleted': 'i-heroicons-minus-circle',
    'blocker_added': 'i-heroicons-no-symbol',
    'blocker_removed': 'i-heroicons-check',
    'priority_changed': 'i-heroicons-flag',
    'type_changed': 'i-heroicons-tag',
    'due_date_changed': 'i-heroicons-calendar',
    'project_changed': 'i-heroicons-folder',
    'milestone_changed': 'i-heroicons-flag',
    'blocked': 'i-heroicons-lock-closed',
    'unblocked': 'i-heroicons-lock-open',
    'completed': 'i-heroicons-check-badge',
    'reopened': 'i-heroicons-arrow-uturn-left'
  }

  // Action colors
  const actionColors: Record<TaskActivityAction, string> = {
    'created': 'green',
    'updated': 'gray',
    'deleted': 'red',
    'status_changed': 'blue',
    'assigned': 'blue',
    'unassigned': 'orange',
    'commented': 'blue',
    'comment_edited': 'gray',
    'comment_deleted': 'gray',
    'mentioned': 'purple',
    'checklist_added': 'gray',
    'checklist_completed': 'green',
    'checklist_uncompleted': 'orange',
    'checklist_deleted': 'gray',
    'blocker_added': 'orange',
    'blocker_removed': 'green',
    'priority_changed': 'yellow',
    'type_changed': 'gray',
    'due_date_changed': 'blue',
    'project_changed': 'blue',
    'milestone_changed': 'blue',
    'blocked': 'red',
    'unblocked': 'green',
    'completed': 'green',
    'reopened': 'orange'
  }

  /**
   * Get action label
   */
  const getActionLabel = (action: TaskActivityAction): string => {
    return actionLabels[action] || action
  }

  /**
   * Get action icon
   */
  const getActionIcon = (action: TaskActivityAction): string => {
    return actionIcons[action] || 'i-heroicons-information-circle'
  }

  /**
   * Get action color
   */
  const getActionColor = (action: TaskActivityAction): string => {
    return actionColors[action] || 'gray'
  }

  /**
   * Fetch activities for a specific task
   */
  const fetchActivities = async (taskUuid: string, params: {
    page?: number
    per_page?: number
    action?: TaskActivityAction
    user_id?: number
    date_from?: string
    date_to?: string
    all?: boolean
  } = {}) => {
    loading.value = true
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params.action) queryParams.append('action', params.action)
      if (params.user_id) queryParams.append('user_id', params.user_id.toString())
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)
      if (params.all) queryParams.append('all', 'true')

      const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const response = await api.request(`/tasks/${taskUuid}/activities${query}`, 'GET')
      
      if (params.all) {
        activities.value = response as TaskActivity[]
      } else {
        const paginatedResponse = response as TaskActivityPagination
        activities.value = paginatedResponse.data
        pagination.value = {
          current_page: paginatedResponse.current_page,
          last_page: paginatedResponse.last_page,
          per_page: paginatedResponse.per_page,
          total: paginatedResponse.total
        }
      }
      
      return activities.value
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar histórico de atividades',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Load more activities (append to existing)
   */
  const loadMoreActivities = async (taskUuid: string) => {
    if (pagination.value.current_page >= pagination.value.last_page) {
      return
    }
    
    loading.value = true
    try {
      const nextPage = pagination.value.current_page + 1
      const response = await api.request(
        `/tasks/${taskUuid}/activities?page=${nextPage}&per_page=${pagination.value.per_page}`,
        'GET'
      ) as TaskActivityPagination
      
      activities.value = [...activities.value, ...response.data]
      pagination.value = {
        current_page: response.current_page,
        last_page: response.last_page,
        per_page: response.per_page,
        total: response.total
      }
      
      return activities.value
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar mais atividades',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch activity stats for a task
   */
  const fetchActivityStats = async (taskUuid: string): Promise<TaskActivityStats> => {
    try {
      const response = await api.request(`/tasks/${taskUuid}/activities/stats`, 'GET') as TaskActivityStats
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar estatísticas de atividades',
        color: 'error'
      })
      throw error
    }
  }

  /**
   * Fetch timeline for multiple tasks (project/dashboard view)
   */
  const fetchTimeline = async (params: {
    page?: number
    per_page?: number
    project_id?: number
    actions?: TaskActivityAction[]
    user_id?: number
    date_from?: string
    date_to?: string
  } = {}): Promise<TaskActivityPagination> => {
    loading.value = true
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params.project_id) queryParams.append('project_id', params.project_id.toString())
      if (params.actions) params.actions.forEach(a => queryParams.append('actions[]', a))
      if (params.user_id) queryParams.append('user_id', params.user_id.toString())
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)

      const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const response = await api.request(`/activities/timeline${query}`, 'GET') as TaskActivityPagination
      
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar linha do tempo',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch mentions for current user
   */
  const fetchMentions = async (params: {
    page?: number
    per_page?: number
    date_from?: string
    date_to?: string
  } = {}): Promise<TaskActivityPagination> => {
    loading.value = true
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.append('page', params.page.toString())
      if (params.per_page) queryParams.append('per_page', params.per_page.toString())
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)

      const query = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const response = await api.request(`/activities/mentions${query}`, 'GET') as TaskActivityPagination
      
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar menções',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch available action types
   */
  const fetchActionTypes = async (): Promise<Record<TaskActivityAction, string>> => {
    try {
      const response = await api.request('/activities/action-types', 'GET') as Record<TaskActivityAction, string>
      return response
    } catch (error) {
      // Return local labels as fallback
      return actionLabels
    }
  }

  /**
   * Group activities by date
   */
  const activitiesByDate = computed(() => {
    const grouped: Record<string, TaskActivity[]> = {}
    
    for (const activity of activities.value) {
      const date = new Date(activity.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
      
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(activity)
    }
    
    return grouped
  })

  /**
   * Format relative time
   */
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'agora'
    if (diffMins < 60) return `há ${diffMins} min`
    if (diffHours < 24) return `há ${diffHours}h`
    if (diffDays < 7) return `há ${diffDays} dias`
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    })
  }

  /**
   * Clear activities
   */
  const clearActivities = () => {
    activities.value = []
    pagination.value = {
      current_page: 1,
      last_page: 1,
      per_page: 20,
      total: 0
    }
  }

  /**
   * Check if there are more pages to load
   */
  const hasMore = computed(() => pagination.value.current_page < pagination.value.last_page)

  return {
    // State
    activities,
    loading,
    pagination,
    
    // Computed
    activitiesByDate,
    hasMore,
    
    // Methods
    fetchActivities,
    loadMoreActivities,
    fetchActivityStats,
    fetchTimeline,
    fetchMentions,
    fetchActionTypes,
    clearActivities,
    
    // Helpers
    getActionLabel,
    getActionIcon,
    getActionColor,
    formatRelativeTime,
    
    // Constants
    actionLabels,
    actionIcons,
    actionColors
  }
}
