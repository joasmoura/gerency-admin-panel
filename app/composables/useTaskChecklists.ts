import type { TaskChecklist } from '~/types'

export function useTaskChecklists() {
  const api = useApi()
  const toast = useToast()

  const checklists = ref<TaskChecklist[]>([])
  const loading = ref(false)

  async function fetchChecklists(taskUuid: string) {
    loading.value = true
    try {
      const response = await api.request(`/tasks/${taskUuid}/checklists`, 'GET') as TaskChecklist[]
      checklists.value = response || []
    } catch (error) {
      console.error('Erro ao carregar checklist:', error)
      checklists.value = []
    } finally {
      loading.value = false
    }
  }

  async function addChecklistItem(taskUuid: string, title: string, blockingTaskUuid?: string) {
    try {
      const payload: any = { title }
      if (blockingTaskUuid) {
        payload.blocking_task_uuid = blockingTaskUuid
      }
      const response = await api.request(`/tasks/${taskUuid}/checklists`, 'POST', payload) as { data: TaskChecklist }
      checklists.value.push(response.data)
      return response.data
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível adicionar o item',
        color: 'error'
      })
      throw error
    }
  }

  async function updateChecklistItem(taskUuid: string, checklistUuid: string, data: Partial<TaskChecklist> & { blocking_task_uuid?: string | null }) {
    try {
      const response = await api.request(`/tasks/${taskUuid}/checklists/${checklistUuid}`, 'PUT', data) as { data: TaskChecklist }
      const index = checklists.value.findIndex(c => c.uuid === checklistUuid)
      if (index !== -1) {
        checklists.value[index] = response.data
      }
      return response.data
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível atualizar o item',
        color: 'error'
      })
      throw error
    }
  }

  async function linkBlockingTask(taskUuid: string, checklistUuid: string, blockingTaskUuid: string | null) {
    return updateChecklistItem(taskUuid, checklistUuid, { blocking_task_uuid: blockingTaskUuid })
  }

  async function toggleChecklistItem(taskUuid: string, checklistUuid: string, isCompleted: boolean) {
    return updateChecklistItem(taskUuid, checklistUuid, { is_completed: isCompleted })
  }

  async function deleteChecklistItem(taskUuid: string, checklistUuid: string) {
    try {
      await api.request(`/tasks/${taskUuid}/checklists/${checklistUuid}`, 'DELETE')
      checklists.value = checklists.value.filter(c => c.uuid !== checklistUuid)
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível remover o item',
        color: 'error'
      })
      throw error
    }
  }

  async function reorderChecklists(taskUuid: string, items: { uuid: string; order: number }[]) {
    try {
      await api.request(`/tasks/${taskUuid}/checklists/reorder`, 'PUT', { items })
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Não foi possível reordenar os itens',
        color: 'error'
      })
      throw error
    }
  }

  // Computed para progresso
  const checklistProgress = computed(() => {
    if (checklists.value.length === 0) return 0
    const completed = checklists.value.filter(c => c.is_completed).length
    return Math.round((completed / checklists.value.length) * 100)
  })

  const completedCount = computed(() => checklists.value.filter(c => c.is_completed).length)
  const totalCount = computed(() => checklists.value.length)

  return {
    checklists,
    loading,
    fetchChecklists,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    reorderChecklists,
    linkBlockingTask,
    checklistProgress,
    completedCount,
    totalCount
  }
}
