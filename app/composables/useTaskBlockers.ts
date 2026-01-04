import { ref } from 'vue'
import type { TaskBlocker } from '~/types'

export function useTaskBlockers() {
  const api = useApi()
  const toast = useToast()

  const blockers = ref<TaskBlocker[]>([])
  const blocking = ref<TaskBlocker[]>([])
  const loading = ref(false)

  /**
   * Buscar impedimentos de uma tarefa (tarefas que bloqueiam esta)
   */
  async function fetchBlockers(taskUuid: string) {
    loading.value = true
    try {
      const response = await api.request(`/tasks/${taskUuid}/blockers`, 'GET') as TaskBlocker[]
      blockers.value = response || []
      return response
    } catch (error) {
      console.error('Erro ao carregar impedimentos:', error)
      blockers.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar tarefas que esta tarefa está bloqueando
   */
  async function fetchBlocking(taskUuid: string) {
    try {
      const response = await api.request(`/tasks/${taskUuid}/blocking`, 'GET') as TaskBlocker[]
      blocking.value = response || []
      return response
    } catch (error) {
      console.error('Erro ao carregar tarefas bloqueadas:', error)
      blocking.value = []
    }
  }

  /**
   * Adicionar impedimento
   */
  async function addBlocker(taskUuid: string, blockingTaskUuid: string) {
    loading.value = true
    try {
      const response = await api.request(`/tasks/${taskUuid}/blockers`, 'POST', {
        blocking_task_uuid: blockingTaskUuid
      }) as { data: TaskBlocker }
      
      blockers.value.push(response.data)
      
      toast.add({
        title: 'Sucesso',
        description: 'Impedimento adicionado',
        color: 'success'
      })
      
      return response.data
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao adicionar impedimento'
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
   * Remover impedimento
   */
  async function removeBlocker(taskUuid: string, blockingTaskUuid: string) {
    loading.value = true
    try {
      await api.request(`/tasks/${taskUuid}/blockers/${blockingTaskUuid}`, 'DELETE')
      
      blockers.value = blockers.value.filter(b => b.uuid !== blockingTaskUuid)
      
      toast.add({
        title: 'Sucesso',
        description: 'Impedimento removido',
        color: 'success'
      })
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao remover impedimento'
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
   * Sincronizar impedimentos (substituir todos)
   */
  async function syncBlockers(taskUuid: string, blockingTaskUuids: string[]) {
    loading.value = true
    try {
      const response = await api.request(`/tasks/${taskUuid}/blockers/sync`, 'PUT', {
        blocking_task_uuids: blockingTaskUuids
      }) as { data: TaskBlocker[] }
      
      blockers.value = response.data || []
      
      toast.add({
        title: 'Sucesso',
        description: 'Impedimentos atualizados',
        color: 'success'
      })
      
      return response.data
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar impedimentos'
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

  // Computed: verificar se todos os blockers estão concluídos
  const areAllBlockersCompleted = computed(() => {
    if (blockers.value.length === 0) return true
    return blockers.value.every(b => b.is_completed)
  })

  // Computed: quantidade de blockers concluídos
  const completedBlockersCount = computed(() => {
    return blockers.value.filter(b => b.is_completed).length
  })

  return {
    blockers,
    blocking,
    loading,
    fetchBlockers,
    fetchBlocking,
    addBlocker,
    removeBlocker,
    syncBlockers,
    areAllBlockersCompleted,
    completedBlockersCount
  }
}
