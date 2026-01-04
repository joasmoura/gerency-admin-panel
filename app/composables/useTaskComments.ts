import { ref } from 'vue'
import type { TaskComment, TaskCommentReaction } from '~/types'

export function useTaskComments() {
  const api = useApi()
  const toast = useToast()

  const comments = ref<TaskComment[]>([])
  const loading = ref(false)

  /**
   * Buscar comentários de uma tarefa
   */
  const fetchComments = async (taskUuid: string) => {
    loading.value = true
    try {
      const response = await api.request(`/tasks/${taskUuid}/comments`, 'GET') as TaskComment[]
      comments.value = response
      return response
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar comentários',
        color: 'error'
      })
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Adicionar comentário
   */
  const addComment = async (taskUuid: string, content: string, parentUuid?: string) => {
    loading.value = true
    try {
      const payload: any = { content }
      if (parentUuid) {
        payload.parent_uuid = parentUuid
      }
      const response = await api.create(`/tasks/${taskUuid}/comments`, payload) as any
      
      if (parentUuid) {
        // É uma resposta, adicionar ao comentário pai
        const parentIndex = comments.value.findIndex(c => c.uuid === parentUuid)
        if (parentIndex !== -1) {
          const parent = comments.value[parentIndex]
          if (parent) {
            if (!parent.replies) {
              parent.replies = []
            }
            parent.replies.push(response.data)
          }
        }
      } else {
        // É um comentário principal
        comments.value.unshift(response.data)
      }
      
      toast.add({
        title: 'Sucesso',
        description: parentUuid ? 'Resposta adicionada' : 'Comentário adicionado',
        color: 'success'
      })
      return response.data
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao adicionar comentário'
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
   * Atualizar comentário
   */
  const updateComment = async (taskUuid: string, commentUuid: string, content: string) => {
    loading.value = true
    try {
      const response = await api.update(`/tasks/${taskUuid}/comments/${commentUuid}`, { content }) as any
      
      // Atualizar no array principal
      const index = comments.value.findIndex(c => c.uuid === commentUuid)
      if (index !== -1) {
        comments.value[index] = { ...comments.value[index], ...response.data }
      } else {
        // Pode ser uma resposta, procurar nos replies
        for (const comment of comments.value) {
          if (comment.replies) {
            const replyIndex = comment.replies.findIndex(r => r.uuid === commentUuid)
            if (replyIndex !== -1) {
              comment.replies[replyIndex] = { ...comment.replies[replyIndex], ...response.data }
              break
            }
          }
        }
      }
      
      toast.add({
        title: 'Sucesso',
        description: 'Comentário atualizado',
        color: 'success'
      })
      return response.data
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao atualizar comentário'
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
   * Excluir comentário
   */
  const deleteComment = async (taskUuid: string, commentUuid: string) => {
    loading.value = true
    try {
      await api.remove(`/tasks/${taskUuid}/comments/${commentUuid}`)
      
      // Remover do array principal
      const index = comments.value.findIndex(c => c.uuid === commentUuid)
      if (index !== -1) {
        comments.value.splice(index, 1)
      } else {
        // Pode ser uma resposta, procurar nos replies
        for (const comment of comments.value) {
          if (comment.replies) {
            const replyIndex = comment.replies.findIndex(r => r.uuid === commentUuid)
            if (replyIndex !== -1) {
              comment.replies.splice(replyIndex, 1)
              break
            }
          }
        }
      }
      
      toast.add({
        title: 'Sucesso',
        description: 'Comentário excluído',
        color: 'success'
      })
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao excluir comentário'
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
   * Toggle reação em um comentário
   */
  const toggleReaction = async (commentUuid: string, emoji: string) => {
    try {
      const response = await api.create(`/comments/${commentUuid}/reactions`, { emoji }) as any
      
      // Atualizar reações no comentário de forma reativa
      for (let i = 0; i < comments.value.length; i++) {
        const comment = comments.value[i]
        if (!comment) continue
        
        if (comment.uuid === commentUuid) {
          // Criar novo objeto para garantir reatividade
          comments.value[i] = {
            ...comment,
            grouped_reactions: response.grouped_reactions
          } as TaskComment
          return response.grouped_reactions
        }
        // Procurar nos replies
        if (comment.replies) {
          for (let j = 0; j < comment.replies.length; j++) {
            const reply = comment.replies[j]
            if (!reply) continue
            
            if (reply.uuid === commentUuid) {
              // Criar novo objeto para garantir reatividade
              comment.replies[j] = {
                ...reply,
                grouped_reactions: response.grouped_reactions
              } as TaskComment
              return response.grouped_reactions
            }
          }
        }
      }
      
      return response.grouped_reactions
    } catch (error: any) {
      const message = error?.data?.message || 'Erro ao reagir'
      toast.add({
        title: 'Erro',
        description: message,
        color: 'error'
      })
      throw error
    }
  }

  return {
    comments,
    loading,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
    toggleReaction
  }
}
