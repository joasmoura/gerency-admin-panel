import { ref, reactive } from 'vue'
import type { Project, ProjectPagination, Customer } from '~/types'

// Estado compartilhado (singleton)
const projects = ref<Project[]>([])
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
  sort: [{ field: 'created_at', direction: 'desc' }],
  includes: [
    {name: 'customer'}, {name: 'responsible'}
  ]
})

export function useProjects() {
  const api = useApi()
  const toast = useToast()

  /**
   * Buscar lista de projetos
   */
  const fetchProjects = async (page: number = 1) => {
    loading.value = true
    try {
      const response = await api.index('projects', page, {
        ...searchParams,
        per_page: pagination.perPage
      }) as ProjectPagination

      projects.value = response.data
      pagination.currentPage = response.current_page
      pagination.lastPage = response.last_page
      pagination.perPage = response.per_page
      pagination.total = response.total

      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar projetos',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Buscar projeto por UUID
   */
  const fetchProject = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.show('/projects', uuid) as Project
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar projeto',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Criar novo projeto
   */
  const createProject = async (data: Partial<Project>) => {
    loading.value = true
    try {
      const response = await api.create('/projects', data)
      toast.add({
        title: 'Sucesso',
        description: 'Projeto criado com sucesso',
        color: 'success'
      })
      await fetchProjects(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao criar projeto'
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
   * Atualizar projeto
   */
  const updateProject = async (uuid: string, data: Partial<Project>) => {
    loading.value = true
    try {
      const response = await api.update(`/projects/${uuid}`, data)
      toast.add({
        title: 'Sucesso',
        description: 'Projeto atualizado com sucesso',
        color: 'success'
      })
      await fetchProjects(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar projeto'
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
   * Excluir projeto
   */
  const deleteProject = async (uuid: string) => {
    loading.value = true
    try {
      const response = await api.remove(`/projects/${uuid}`)
      toast.add({
        title: 'Sucesso',
        description: 'Projeto excluído com sucesso',
        color: 'success'
      })
      await fetchProjects(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir projeto'
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
   * Excluir múltiplos projetos
   */
  const deleteProjects = async (uuids: string[]) => {
    loading.value = true
    try {
      const response = await api.request('/projects/batch', 'DELETE', { uuids })
      toast.add({
        title: 'Sucesso',
        description: `${uuids.length} projeto(s) excluído(s) com sucesso`,
        color: 'success'
      })
      await fetchProjects(pagination.currentPage)
      return response
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir projetos'
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
   * Definir filtros de busca
   */
  const setFilters = (filters: any[]) => {
    searchParams.filters = filters
  }

  /**
   * Definir ordenação
   */
  const setSort = (sort: { field: string; direction: 'asc' | 'desc' }[]) => {
    searchParams.sort = sort
  }

  /**
   * Definir busca
   */
  const setSearch = (search: Record<string, any>) => {
    searchParams.search = search
  }

  return {
    // Estado
    projects,
    loading,
    pagination,
    searchParams,

    // Métodos
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
    deleteProjects,
    setFilters,
    setSort,
    setSearch
  }
}

export default useProjects
