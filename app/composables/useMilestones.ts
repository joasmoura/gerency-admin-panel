import { ref, reactive } from 'vue'
import type { Milestone, MilestonePagination } from '~/types'

// Estado compartilhado (singleton)
const milestones = ref<Milestone[]>([])
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
  includes: [{ name: 'project' }]
})

export function useMilestones() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de marcos
   */
  const fetchMilestones = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('milestones', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as MilestonePagination

      milestones.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar marcos',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar marcos por projeto
   */
  const fetchMilestonesByProject = async (projectId: number) => {
    loading.value = true
    try {
      const response = await api.index('milestones', 1, {
        all: true,
        filters: [
          { field: 'project_id', operator: '=', value: projectId }
        ]
      }) as Milestone[]

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar marcos',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar todos os marcos (sem paginação)
   */
  const fetchAllMilestones = async () => {
    loading.value = true
    try {
      const response = await api.index('milestones', 1, {
        all: true,
        includes: [{ name: 'project' }]
      }) as Milestone[]

      milestones.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar marcos',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar marco por UUID
   */
  const fetchMilestone = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/milestones', uuid) as Milestone
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar marco',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar novo marco
   */
  const createMilestone = async (data: Partial<Milestone>) => {
    loading.value = true
    try {
      const response = await api.create('/milestones', data)
      toast.add({
        title: 'Sucesso',
        description: 'Marco criado com sucesso',
        color: 'success'
      })
      await fetchMilestones(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar marco'
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
   * Atualizar marco
   */
  const updateMilestone = async (uuid: string, data: Partial<Milestone>) => {
    loading.value = true
    try {
      const response = await api.update(`/milestones/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Marco atualizado com sucesso',
        color: 'success'
      })
      await fetchMilestones(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar marco'
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
   * Excluir marco
   */
  const deleteMilestone = async (uuid: string) => {
    loading.value = true
    try {
      await api.remove(`/milestones/${uuid}`)
      toast.add({
        title: 'Sucesso',
        description: 'Marco excluído com sucesso',
        color: 'success'
      })
      await fetchMilestones(pagination.currentPage)
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir marco'
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
    milestones,
    loading,
    pagination,
    searchParams,
    fetchMilestones,
    fetchMilestonesByProject,
    fetchAllMilestones,
    fetchMilestone,
    createMilestone,
    updateMilestone,
    deleteMilestone
  }
}
