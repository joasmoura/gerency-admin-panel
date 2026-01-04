<script setup lang="ts">
import type { Task, TaskComment, TaskChecklist } from '~/types'
import { AuthStore } from '~/stores/authStore'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  edit: [task: Task]
  close: []
  updated: [task: Task]
  'open-task': [taskUuid: string]
}>()

const open = defineModel<boolean>('open', { default: false })

const { updateTaskSilent, deleteTask, fetchKanbanTasks } = useTasks()
const { taskStatuses, fetchAllTaskStatuses } = useTaskStatuses()
const { taskPriorities, fetchAllTaskPriorities } = useTaskPriorities()
const { taskTypes, fetchAllTaskTypes } = useTaskTypes()
const { projects, fetchProjects } = useProjects()
const { fetchMilestonesByProject } = useMilestones()
const { comments, loading: commentsLoading, fetchComments, addComment, updateComment, deleteComment, toggleReaction } = useTaskComments()
const { 
  checklists, 
  loading: checklistsLoading, 
  fetchChecklists, 
  addChecklistItem, 
  updateChecklistItem, 
  toggleChecklistItem, 
  deleteChecklistItem,
  linkBlockingTask,
  checklistProgress,
  completedCount,
  totalCount
} = useTaskChecklists()
const {
  blockers,
  blocking,
  loading: blockersLoading,
  fetchBlockers,
  fetchBlocking,
  addBlocker,
  removeBlocker,
  areAllBlockersCompleted,
  completedBlockersCount
} = useTaskBlockers()

const toast = useToast()
const api = useApi()
const authStore = AuthStore()

// Estado local editável da tarefa
const localTask = reactive<Partial<Task>>({})
const members = ref<any[]>([])
const projectMilestones = ref<any[]>([])
const saving = ref(false)
const activeTab = ref('description')
const isInitializing = ref(false)
const isEditingDescription = ref(false)

// Novo comentário
const newComment = ref('')
const addingComment = ref(false)

// Estados para edição e resposta de comentários
const editingCommentUuid = ref<string | null>(null)
const editingCommentContent = ref('')
const replyingToUuid = ref<string | null>(null)
const replyContent = ref('')
const showEmojiPicker = ref<string | null>(null)

// Emojis disponíveis para reações
const availableEmojis = ['👍', '👎', '❤️', '😄', '😢', '😮', '🎉', '🚀', '👀', '💯']

// Checklist
const newChecklistItem = ref('')
const addingChecklistItem = ref(false)
const editingChecklistUuid = ref<string | null>(null)
const editingChecklistTitle = ref('')

// Link Task Modal
const linkTaskModalOpen = ref(false)
const linkingChecklistUuid = ref<string | null>(null)
const searchTaskQuery = ref('')
const searchedTasks = ref<Task[]>([])
const searchingTasks = ref(false)

// Blockers Modal (tarefas que bloqueiam esta tarefa)
const blockerModalOpen = ref(false)
const searchBlockerQuery = ref('')
const searchedBlockerTasks = ref<Task[]>([])
const searchingBlockerTasks = ref(false)
const addingBlocker = ref(false)

// Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Computed properties
const isOverdue = computed(() => {
  if (!localTask.due_date || localTask.completed_at) return false
  return new Date(localTask.due_date) < new Date()
})

const formattedCreatedAt = computed(() => {
  if (!props.task.created_at) return ''
  return new Date(props.task.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const formattedCompletedAt = computed(() => {
  if (!props.task.completed_at) return ''
  return new Date(props.task.completed_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// Options para selects
const projectOptions = computed(() => 
  projects.value.map(p => ({ label: p.name, value: p.id }))
)

const milestoneOptions = computed(() => 
  projectMilestones.value.map(m => ({ label: m.name, value: m.id }))
)

const statusOptions = computed(() => 
  taskStatuses.value.map(s => ({ 
    label: s.name, 
    value: s.id,
    color: s.color 
  }))
)

const priorityOptions = computed(() => 
  taskPriorities.value.map(p => ({ 
    label: p.name, 
    value: p.id,
    color: p.color 
  }))
)

const typeOptions = computed(() => 
  taskTypes.value.map(t => ({ 
    label: t.name, 
    value: t.id,
    color: t.color,
    icon: t.icon 
  }))
)

const memberOptions = computed(() => 
  members.value.map(m => ({ 
    label: m.name, 
    value: m.id,
    avatar: m.avatar 
  }))
)

const tabs = [
  { label: 'Geral', value: 'description', icon: 'i-lucide-file-text' },
  { label: 'Mensagens', value: 'messages', icon: 'i-lucide-message-circle' },
  { label: 'Histórico', value: 'timeline', icon: 'i-lucide-history' }
]

// Time tracking computed properties
const totalEstimatedMinutes = computed(() => {
  return ((localTask.estimated_hours || 0) * 60) + (localTask.estimated_minutes || 0)
})

const totalWorkedMinutes = computed(() => {
  return ((localTask.worked_hours || 0) * 60) + (localTask.worked_minutes || 0)
})

const timeProgressPercentage = computed(() => {
  if (totalEstimatedMinutes.value === 0) return 0
  return Math.round((totalWorkedMinutes.value / totalEstimatedMinutes.value) * 100)
})

function formatTimeDisplay(hours: number, minutes: number): string {
  if (hours === 0 && minutes === 0) return '0h'
  if (hours === 0) return `${minutes}min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

// Função para inicializar dados locais
async function initializeLocalTask() {
  if (!props.task) return

  isInitializing.value = true

  // Copiar dados da tarefa para estado local
  localTask.title = props.task.title
  localTask.description = props.task.description || ''
  localTask.project_id = props.task.project_id ? Number(props.task.project_id) : undefined
  localTask.milestone_id = props.task.milestone_id ? Number(props.task.milestone_id) : undefined
  localTask.status_id = props.task.status_id ? Number(props.task.status_id) : undefined
  localTask.priority_id = props.task.priority_id ? Number(props.task.priority_id) : undefined
  localTask.type_id = props.task.type_id ? Number(props.task.type_id) : undefined
  localTask.responsible_id = props.task.responsible_id ? Number(props.task.responsible_id) : undefined
  localTask.due_date = props.task.due_date ? props.task.due_date.split('T')[0] : undefined
  localTask.estimated_hours = props.task.estimated_hours || 0
  localTask.estimated_minutes = props.task.estimated_minutes || 0
  localTask.worked_hours = props.task.worked_hours || 0
  localTask.worked_minutes = props.task.worked_minutes || 0
  localTask.value = props.task.value || 0
  localTask.is_blocked = props.task.is_blocked || false
  localTask.block_reason = props.task.block_reason || ''

  // Aguardar próximo tick para garantir que os valores foram setados
  await nextTick()
  isInitializing.value = false

  // Carregar dados necessários
  await Promise.all([
    fetchAllTaskStatuses(),
    fetchAllTaskPriorities(),
    fetchAllTaskTypes(),
    fetchProjects(),
    loadMembers(),
    fetchComments(props.task.uuid),
    fetchChecklists(props.task.uuid),
    fetchBlockers(props.task.uuid),
    fetchBlocking(props.task.uuid)
  ])

  // Carregar milestones se houver projeto
  if (props.task.project_id) {
    projectMilestones.value = await fetchMilestonesByProject(props.task.project_id)
  }
}

// Watch para carregar dados quando modal abre
watch(open, async (isOpen) => {
  if (isOpen && props.task) {
    await initializeLocalTask()
  }
}, { immediate: true })

// Watch para quando a task muda enquanto o modal está aberto
watch(() => props.task, async (newTask) => {
  if (open.value && newTask) {
    await initializeLocalTask()
  }
}, { deep: true })

// Watch para mudança de projeto (carregar milestones)
watch(() => localTask.project_id, async (newProjectId, oldProjectId) => {
  if (isInitializing.value) return
  if (newProjectId && newProjectId !== oldProjectId) {
    projectMilestones.value = await fetchMilestonesByProject(newProjectId)
    if (oldProjectId) {
      localTask.milestone_id = undefined
    }
  } else if (!newProjectId) {
    projectMilestones.value = []
    localTask.milestone_id = undefined
  }
})

// Função de debounce para salvar alterações
function debounceSave(field: keyof Task, value: any) {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(async () => {
    await saveField(field, value)
  }, 800)
}

// Salvar campo individual
async function saveField(field: keyof Task, value: any) {
  if (saving.value) return

  saving.value = true
  try {
    const data = { [field]: value }
    await updateTaskSilent(props.task.uuid, data)
    emit('updated', { ...props.task, ...data })
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  } finally {
    saving.value = false
  }
}

// Watcher para campos com debounce
watch(() => localTask.title, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.title) {
    debounceSave('title', newVal)
  }
})

watch(() => localTask.description, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== (props.task.description || '')) {
    debounceSave('description', newVal)
  }
})

watch(() => localTask.status_id, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.status_id) {
    saveField('status_id', newVal)
  }
})

watch(() => localTask.priority_id, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.priority_id) {
    saveField('priority_id', newVal)
  }
})

watch(() => localTask.type_id, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.type_id) {
    saveField('type_id', newVal)
  }
})

watch(() => localTask.project_id, (newVal, oldVal) => {
  if (isInitializing.value) return
  // Só salva se o valor mudou em relação ao original da tarefa
  if (newVal !== props.task.project_id) {
    saveField('project_id', newVal || null)
  }
})

watch(() => localTask.milestone_id, (newVal, oldVal) => {
  if (isInitializing.value) return
  // Só salva se o valor mudou em relação ao original da tarefa
  if (newVal !== props.task.milestone_id) {
    saveField('milestone_id', newVal || null)
  }
})

watch(() => localTask.responsible_id, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.responsible_id) {
    saveField('responsible_id', newVal)
  }
})

watch(() => localTask.due_date, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.due_date) {
    saveField('due_date', newVal)
  }
})

watch(() => localTask.estimated_hours, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.estimated_hours) {
    debounceSave('estimated_hours', newVal)
  }
})

watch(() => localTask.estimated_minutes, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.estimated_minutes) {
    debounceSave('estimated_minutes', newVal)
  }
})

watch(() => localTask.worked_hours, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.worked_hours) {
    debounceSave('worked_hours', newVal)
  }
})

watch(() => localTask.worked_minutes, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.worked_minutes) {
    debounceSave('worked_minutes', newVal)
  }
})

watch(() => localTask.value, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.value) {
    debounceSave('value', newVal)
  }
})

watch(() => localTask.is_blocked, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.is_blocked) {
    saveField('is_blocked', newVal)
  }
})

watch(() => localTask.block_reason, (newVal) => {
  if (isInitializing.value) return
  if (newVal !== props.task.block_reason) {
    debounceSave('block_reason', newVal)
  }
})

async function loadMembers() {
  try {
    const response = await api.request('/members?all=1', 'GET') as any
    members.value = response || []
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
  }
}

async function handleDelete() {
  if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return
  
  try {
    await deleteTask(props.task.uuid)
    open.value = false
    emit('close')
  } catch (error) {
    // Error handled by composable
  }
}

function handleClose() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  open.value = false
  emit('close')
}

function copyTaskLink() {
  const url = `${window.location.origin}/tasks/${props.task.uuid}`
  navigator.clipboard.writeText(url)
  toast.add({
    title: 'Copiado',
    description: 'Link da tarefa copiado para a área de transferência',
    color: 'success'
  })
}

// Helper para verificar se o conteúdo HTML está vazio
function isHtmlEmpty(html: string): boolean {
  if (!html) return true
  const stripped = html.replace(/<[^>]*>/g, '').trim()
  return stripped.length === 0
}

const isCommentEmpty = computed(() => isHtmlEmpty(newComment.value))
const isReplyEmpty = computed(() => isHtmlEmpty(replyContent.value))

// Verificar se o usuário é dono do comentário
function isCommentOwner(comment: TaskComment): boolean {
  const currentUserId = authStore.user?.id
  if (!currentUserId) return false
  
  // Comparar com user_id ou user.id (convertendo para número para garantir comparação correta)
  return Number(comment.user_id) === Number(currentUserId) || 
         Number(comment.user?.id) === Number(currentUserId)
}

// Verificar se o usuário já reagiu com este emoji
function hasUserReacted(comment: TaskComment, emoji: string): boolean {
  const reaction = comment.grouped_reactions?.find(r => r.emoji === emoji)
  return reaction?.users?.includes(authStore.user?.id || 0) || false
}

// Funções de comentários
async function handleAddComment() {
  if (isHtmlEmpty(newComment.value)) return

  addingComment.value = true
  try {
    await addComment(props.task.uuid, newComment.value)
    newComment.value = ''
  } catch (error) {
    // Erro tratado pelo composable
  } finally {
    addingComment.value = false
  }
}

// Responder comentário
async function handleReply(parentUuid: string) {
  if (isHtmlEmpty(replyContent.value)) return

  addingComment.value = true
  try {
    await addComment(props.task.uuid, replyContent.value, parentUuid)
    replyContent.value = ''
    replyingToUuid.value = null
  } catch (error) {
    // Erro tratado pelo composable
  } finally {
    addingComment.value = false
  }
}

// Iniciar edição de comentário
function startEditingComment(comment: TaskComment) {
  editingCommentUuid.value = comment.uuid
  editingCommentContent.value = comment.content
}

// Salvar edição de comentário
async function saveEditingComment() {
  if (!editingCommentUuid.value || isHtmlEmpty(editingCommentContent.value)) return

  try {
    await updateComment(props.task.uuid, editingCommentUuid.value, editingCommentContent.value)
    editingCommentUuid.value = null
    editingCommentContent.value = ''
  } catch (error) {
    // Erro tratado pelo composable
  }
}

// Cancelar edição
function cancelEditingComment() {
  editingCommentUuid.value = null
  editingCommentContent.value = ''
}

// Toggle reação
async function handleToggleReaction(commentUuid: string, emoji: string) {
  try {
    await toggleReaction(commentUuid, emoji)
    showEmojiPicker.value = null
  } catch (error) {
    // Erro tratado pelo composable
  }
}

// Toggle emoji picker
function toggleEmojiPicker(commentUuid: string) {
  if (showEmojiPicker.value === commentUuid) {
    showEmojiPicker.value = null
  } else {
    showEmojiPicker.value = commentUuid
  }
}

// Iniciar resposta
function startReply(commentUuid: string) {
  replyingToUuid.value = commentUuid
  replyContent.value = ''
}

// Cancelar resposta
function cancelReply() {
  replyingToUuid.value = null
  replyContent.value = ''
}

async function handleDeleteComment(commentUuid: string) {
  if (!confirm('Tem certeza que deseja excluir este comentário?')) return
  
  try {
    await deleteComment(props.task.uuid, commentUuid)
  } catch (error) {
    // Erro tratado pelo composable
  }
}

function formatCommentDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Agora mesmo'
  if (minutes < 60) return `${minutes} min atrás`
  if (hours < 24) return `${hours}h atrás`
  if (days < 7) return `${days} dias atrás`

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Funções de checklist
async function handleAddChecklistItem() {
  if (!newChecklistItem.value.trim()) return

  addingChecklistItem.value = true
  try {
    await addChecklistItem(props.task.uuid, newChecklistItem.value.trim())
    newChecklistItem.value = ''
    // Atualizar o kanban para refletir o progresso do checklist
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  } finally {
    addingChecklistItem.value = false
  }
}

async function handleToggleChecklistItem(item: TaskChecklist) {
  try {
    await toggleChecklistItem(props.task.uuid, item.uuid, !item.is_completed)
    // Atualizar o kanban para refletir o progresso do checklist
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  }
}

async function handleDeleteChecklistItem(checklistUuid: string) {
  try {
    await deleteChecklistItem(props.task.uuid, checklistUuid)
    // Atualizar o kanban para refletir o progresso do checklist
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  }
}

function startEditingChecklistItem(item: TaskChecklist) {
  editingChecklistUuid.value = item.uuid
  editingChecklistTitle.value = item.title
}

async function saveEditingChecklistItem() {
  if (!editingChecklistUuid.value || !editingChecklistTitle.value.trim()) return

  try {
    await updateChecklistItem(props.task.uuid, editingChecklistUuid.value, {
      title: editingChecklistTitle.value.trim()
    })
    editingChecklistUuid.value = null
    editingChecklistTitle.value = ''
    // Atualizar o kanban para refletir as mudanças
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  }
}

function cancelEditingChecklistItem() {
  editingChecklistUuid.value = null
  editingChecklistTitle.value = ''
}

function handleChecklistKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleAddChecklistItem()
  }
}

function handleEditChecklistKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    saveEditingChecklistItem()
  } else if (event.key === 'Escape') {
    cancelEditingChecklistItem()
  }
}

// Link Task Functions
function openLinkTaskModal(checklistUuid: string) {
  linkingChecklistUuid.value = checklistUuid
  searchTaskQuery.value = ''
  searchedTasks.value = []
  linkTaskModalOpen.value = true
}

async function searchTasks() {
  if (!searchTaskQuery.value.trim()) {
    searchedTasks.value = []
    return
  }
  
  searchingTasks.value = true
  try {
    const response = await api.request('/tasks/search', 'POST', {
      search: searchTaskQuery.value,
      per_page: 10,
      exclude_uuid: props.task.uuid // Excluir a tarefa atual
    }) as any
    searchedTasks.value = response.data || []
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error)
    searchedTasks.value = []
  } finally {
    searchingTasks.value = false
  }
}

async function handleLinkBlockingTask(taskToLink: Task) {
  if (!linkingChecklistUuid.value) return
  
  try {
    await linkBlockingTask(props.task.uuid, linkingChecklistUuid.value, taskToLink.uuid)
    linkTaskModalOpen.value = false
    linkingChecklistUuid.value = null
    toast.add({
      title: 'Sucesso',
      description: 'Tarefa vinculada com sucesso',
      color: 'success'
    })
    // Atualizar o kanban para refletir as mudanças
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  }
}

async function handleUnlinkBlockingTask(checklistUuid: string) {
  try {
    await linkBlockingTask(props.task.uuid, checklistUuid, null)
    toast.add({
      title: 'Sucesso',
      description: 'Vínculo removido',
      color: 'success'
    })
    // Atualizar o kanban para refletir as mudanças
    await fetchKanbanTasks()
  } catch (error) {
    // Erro tratado pelo composable
  }
}

// Debounce para busca de tarefas
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearchTaskInput() {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    searchTasks()
  }, 300)
}

// === BLOCKERS (Impedimentos) ===
function openBlockerModal() {
  searchBlockerQuery.value = ''
  searchedBlockerTasks.value = []
  blockerModalOpen.value = true
  searchBlockerTasks() // Carregar tarefas inicialmente
}

async function searchBlockerTasks() {
  searchingBlockerTasks.value = true
  try {
    const response = await api.request('/tasks/search', 'POST', {
      search: searchBlockerQuery.value,
      per_page: 10,
      exclude_uuid: props.task.uuid, // Excluir a tarefa atual
      exclude_uuids: blockers.value.map(b => b.uuid) // Excluir blockers já existentes
    }) as any
    searchedBlockerTasks.value = response.data || []
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error)
    searchedBlockerTasks.value = []
  } finally {
    searchingBlockerTasks.value = false
  }
}

let searchBlockerDebounceTimer: ReturnType<typeof setTimeout> | null = null
function handleSearchBlockerInput() {
  if (searchBlockerDebounceTimer) clearTimeout(searchBlockerDebounceTimer)
  searchBlockerDebounceTimer = setTimeout(() => {
    searchBlockerTasks()
  }, 300)
}

async function handleAddBlocker(blockingTask: Task) {
  addingBlocker.value = true
  try {
    await addBlocker(props.task.uuid, blockingTask.uuid)
    // Remover da lista de busca
    searchedBlockerTasks.value = searchedBlockerTasks.value.filter(t => t.uuid !== blockingTask.uuid)
    toast.add({
      title: 'Sucesso',
      description: `Tarefa #${blockingTask.code} adicionada como bloqueadora`,
      color: 'success'
    })
  } catch (error) {
    // Erro tratado pelo composable
  } finally {
    addingBlocker.value = false
  }
}

async function handleRemoveBlocker(blockerUuid: string) {
  try {
    await removeBlocker(props.task.uuid, blockerUuid)
    toast.add({
      title: 'Sucesso',
      description: 'Impedimento removido',
      color: 'success'
    })
  } catch (error) {
    // Erro tratado pelo composable
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    class="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-[95vw] sm:max-h-[95vh] w-[95vw] h-[95vh]"
    @close="handleClose"
  >
    <template #content>
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex-1 pr-4">
            <div class="flex items-center gap-3 mb-2">
              <UBadge variant="subtle" color="neutral" class="font-mono">#{{ task.code }}</UBadge>
              
              <UBadge
                v-if="task.type"
                :label="task.type.name"
                size="sm"
                :style="{ backgroundColor: task.type.color + '20', color: task.type.color }"
              />
              
              <UBadge
                v-if="task.status"
                :label="task.status.name"
                size="sm"
                :style="{ backgroundColor: task.status.color + '20', color: task.status.color }"
              />

              <span v-if="saving" class="text-xs text-gray-500 flex items-center gap-1">
                <UIcon name="i-lucide-loader-2" class="w-3 h-3 animate-spin" />
                Salvando...
              </span>
            </div>
            
            <UInput
              v-model="localTask.title"
              variant="ghost"
              :ui="{ base: 'text-xl font-semibold text-gray-900 dark:text-gray-100 py-0 border-0 focus:ring-0 bg-transparent w-full' }"
              placeholder="Título da tarefa"
              class="w-full"
            />
          </div>

          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-link"
              variant="ghost"
              size="sm"
              @click="copyTaskLink"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              size="sm"
              color="error"
              @click="handleDelete"
            />
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              size="sm"
              @click="handleClose"
            />
          </div>
        </div>

        <!-- Content: Two Columns -->
        <div class="flex-1 overflow-hidden flex">
          <!-- Left Column: Task Fields -->
          <div class="w-[300px] border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 space-y-4">
            <!-- Status -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Status</label>
              <USelectMenu
                v-model="localTask.status_id"
                :items="statusOptions"
                placeholder="Selecione um status"
                value-key="value"
                class="w-full"
              >
                <template #item="{ item }">
                  <span
                    class="w-3 h-3 rounded-full mr-2"
                    :style="{ backgroundColor: item.color }"
                  ></span>
                  {{ item.label }}
                </template>
              </USelectMenu>
            </div>

            <!-- Priority -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Prioridade</label>
              <USelectMenu
                v-model="localTask.priority_id"
                :items="priorityOptions"
                placeholder="Selecione a prioridade"
                value-key="value"
                class="w-full"
              >
                <template #item="{ item }">
                  <span
                    class="w-3 h-3 rounded-full mr-2"
                    :style="{ backgroundColor: item.color }"
                  ></span>
                  {{ item.label }}
                </template>
              </USelectMenu>
            </div>

            <!-- Type -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Tipo</label>
              <USelectMenu
                v-model="localTask.type_id"
                :items="typeOptions"
                placeholder="Selecione um tipo"
                value-key="value"
                class="w-full"
              >
                <template #item="{ item }">
                  <span
                    class="w-3 h-3 rounded-full mr-2"
                    :style="{ backgroundColor: item.color }"
                  ></span>
                  {{ item.label }}
                </template>
              </USelectMenu>
            </div>

            <!-- Project -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Projeto</label>
              <USelectMenu
                v-model="localTask.project_id"
                :items="projectOptions"
                placeholder="Selecione um projeto"
                value-key="value"
                searchable
                class="w-full"
              />
            </div>

            <!-- Milestone -->
            <div v-if="localTask.project_id">
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Marco</label>
              <USelectMenu
                v-model="localTask.milestone_id"
                :items="milestoneOptions"
                placeholder="Selecione um marco"
                value-key="value"
                class="w-full"
              />
            </div>

            <!-- Responsible -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Responsável</label>
              <USelectMenu
                v-model="localTask.responsible_id"
                :items="memberOptions"
                placeholder="Selecione um responsável"
                value-key="value"
                searchable
                class="w-full"
              >
                <template #item="{ item }">
                  <UAvatar :alt="item.label" :src="item.avatar" size="2xs" class="mr-2" />
                  {{ item.label }}
                </template>
              </USelectMenu>
            </div>

            <!-- Due Date -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Data de Vencimento</label>
              <div class="flex items-center gap-2">
                <UInput
                  v-model="localTask.due_date"
                  type="date"
                  :class="{ 'text-red-500': isOverdue }"
                />
                <UBadge v-if="isOverdue" label="Vencida" color="error" size="xs" />
              </div>
            </div>

            <!-- Estimated Time -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Horas Estimadas</label>
                <UInput
                  v-model.number="localTask.estimated_hours"
                  type="number"
                  :min="0"
                  placeholder="0"
                >
                  <template #trailing>
                    <span class="text-gray-500 text-sm">h</span>
                  </template>
                </UInput>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Minutos</label>
                <UInput
                  v-model.number="localTask.estimated_minutes"
                  type="number"
                  :min="0"
                  :max="59"
                  placeholder="0"
                >
                  <template #trailing>
                    <span class="text-gray-500 text-sm">min</span>
                  </template>
                </UInput>
              </div>
            </div>

            <!-- Worked Time -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Horas Trabalhadas</label>
                <UInput
                  v-model.number="localTask.worked_hours"
                  type="number"
                  :min="0"
                  placeholder="0"
                >
                  <template #trailing>
                    <span class="text-gray-500 text-sm">h</span>
                  </template>
                </UInput>
              </div>
              <div>
                <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Minutos</label>
                <UInput
                  v-model.number="localTask.worked_minutes"
                  type="number"
                  :min="0"
                  :max="59"
                  placeholder="0"
                >
                  <template #trailing>
                    <span class="text-gray-500 text-sm">min</span>
                  </template>
                </UInput>
              </div>
            </div>

            <!-- Time Progress Indicator -->
            <div v-if="totalEstimatedMinutes > 0" class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Progresso de Tempo</span>
                <span :class="[
                  'text-xs font-medium',
                  timeProgressPercentage > 100 ? 'text-red-500' : timeProgressPercentage >= 80 ? 'text-yellow-500' : 'text-green-500'
                ]">
                  {{ timeProgressPercentage }}%
                </span>
              </div>
              <UProgress 
                :value="Math.min(timeProgressPercentage, 100)" 
                :color="timeProgressPercentage > 100 ? 'error' : timeProgressPercentage >= 80 ? 'warning' : 'success'"
                size="sm"
              />
              <div class="flex justify-between mt-1 text-xs text-gray-500">
                <span>{{ formatTimeDisplay(localTask.worked_hours || 0, localTask.worked_minutes || 0) }} trabalhado</span>
                <span>{{ formatTimeDisplay(localTask.estimated_hours || 0, localTask.estimated_minutes || 0) }} estimado</span>
              </div>
            </div>

            <!-- Value -->
            <div>
              <label class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Valor (R$)</label>
              <UInput
                v-model.number="localTask.value"
                type="number"
                :min="0"
                step="0.01"
                placeholder="0,00"
              />
            </div>

            <!-- Impedimentos (Blockers) -->
            <div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
              <!-- Switch para marcar como bloqueada -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <USwitch v-model="localTask.is_blocked" size="sm" />
                  <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-yellow-500" />
                  <span class="text-sm font-medium">Marcar como Impedida</span>
                </div>
              </div>

              <!-- Descrição do impedimento (quando bloqueada) -->
              <div v-if="localTask.is_blocked" class="space-y-3">
                <UTextarea
                  v-model="localTask.block_reason"
                  placeholder="Descreva o motivo do impedimento..."
                  :rows="2"
                  class="text-sm"
                />

                <!-- Header de tarefas bloqueadoras -->
                <div class="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium text-gray-500">Tarefas bloqueadoras</span>
                    <UBadge v-if="blockers.length > 0" :label="`${completedBlockersCount}/${blockers.length}`" :color="areAllBlockersCompleted ? 'success' : 'warning'" size="xs" />
                  </div>
                  <UButton
                    icon="i-lucide-plus"
                    size="xs"
                    variant="ghost"
                    @click="openBlockerModal"
                    title="Adicionar tarefa bloqueadora"
                  />
                </div>

                <!-- Lista de blockers -->
                <div v-if="blockers.length > 0" class="space-y-2">
                  <div
                    v-for="blocker in blockers"
                    :key="blocker.pivot_uuid"
                    class="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <button 
                      class="flex items-center gap-2 min-w-0 flex-1 text-left"
                      @click="emit('open-task', blocker.uuid)"
                    >
                      <UIcon 
                        :name="blocker.is_completed ? 'i-lucide-check-circle' : 'i-lucide-circle'" 
                        :class="blocker.is_completed ? 'w-4 h-4 text-green-500' : 'w-4 h-4 text-orange-500'"
                      />
                      <span class="text-xs font-mono text-gray-500">#{{ blocker.code }}</span>
                      <span class="text-sm truncate hover:text-primary-500">{{ blocker.title }}</span>
                    </button>
                    <UButton
                      icon="i-lucide-x"
                      size="xs"
                      variant="ghost"
                      color="error"
                      @click="handleRemoveBlocker(blocker.uuid)"
                      title="Remover"
                    />
                  </div>
                </div>

                <!-- Status de todos concluídos -->
                <div v-if="blockers.length > 0 && areAllBlockersCompleted" class="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-green-500" />
                  <span class="text-xs text-green-600 dark:text-green-400">Todos os impedimentos foram resolvidos!</span>
                </div>
              </div>

              <!-- Tarefas que esta tarefa está bloqueando -->
              <div v-if="blocking.length > 0" class="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-2 mb-2">
                  <UIcon name="i-lucide-lock" class="w-4 h-4 text-red-500" />
                  <span class="text-xs font-medium text-gray-500">Esta tarefa está bloqueando</span>
                  <UBadge :label="String(blocking.length)" color="error" size="xs" />
                </div>
                <div class="space-y-1">
                  <button
                    v-for="blocked in blocking"
                    :key="blocked.pivot_uuid"
                    class="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md text-sm w-full text-left hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                    @click="emit('open-task', blocked.uuid)"
                  >
                    <span class="text-xs font-mono text-gray-500">#{{ blocked.code }}</span>
                    <span class="truncate text-red-700 dark:text-red-400 hover:underline">{{ blocked.title }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Creator Info -->
            <div v-if="task.creator" class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <UAvatar :alt="task.creator.name" size="xs" />
                <span>Criado por <strong>{{ task.creator.name }}</strong></span>
              </div>
              <p class="text-xs text-gray-400 mt-1">{{ formattedCreatedAt }}</p>
            </div>

            <!-- Completed Info -->
            <div v-if="task.completed_at" class="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <UIcon name="i-lucide-check-circle" class="w-4 h-4" />
                <span>Concluída em <strong>{{ formattedCompletedAt }}</strong></span>
              </div>
            </div>
          </div>

          <!-- Right Column: Tabs -->
          <div class="grow overflow-hidden flex flex-col">
            <!-- Tab Navigation -->
            <div class="border-b border-gray-200 dark:border-gray-700">
              <nav class="flex">
                <button
                  v-for="tab in tabs"
                  :key="tab.value"
                  @click="activeTab = tab.value"
                  :class="[
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.value
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  ]"
                >
                  <UIcon :name="tab.icon" class="w-4 h-4" />
                  {{ tab.label }}
                  <UBadge
                    v-if="tab.value === 'messages' && comments.length > 0"
                    :label="String(comments.length)"
                    size="xs"
                    color="neutral"
                    variant="subtle"
                  />
                </button>
              </nav>
            </div>

            <!-- Tab Content -->
            <div class="flex-1 overflow-y-auto">
              <!-- Description Tab -->
              <div v-if="activeTab === 'description'" class="p-4">
                <!-- Descrição: Modo Edição -->
                <div v-if="isEditingDescription" class="flex flex-col">
                  <div class="flex items-center justify-end mb-2">
                    <UButton
                      icon="i-lucide-check"
                      size="sm"
                      color="primary"
                      variant="soft"
                      @click="isEditingDescription = false"
                    >
                      Concluir edição
                    </UButton>
                  </div>
                  <RichTextEditor
                    v-model="localTask.description"
                    placeholder="Adicione uma descrição para esta tarefa..."
                    toolbar="full"
                    height="200px"
                    :enable-mentions="true"
                    :members="members"
                  />
                </div>

                <!-- Descrição: Modo Visualização -->
                <div v-else>
                  <div class="flex items-center justify-end mb-2">
                    <UButton
                      icon="i-lucide-pencil"
                      size="sm"
                      variant="soft"
                      @click="isEditingDescription = true"
                    >
                      Editar descrição
                    </UButton>
                  </div>
                  
                  <div
                    v-if="localTask.description && !isHtmlEmpty(localTask.description)"
                    class="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[60px]"
                    @click="isEditingDescription = true"
                    v-html="localTask.description"
                  />
                  
                  <div
                    v-else
                    class="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-[60px]"
                    @click="isEditingDescription = true"
                  >
                    <UIcon name="i-lucide-file-text" class="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2" />
                    <p class="text-gray-500 dark:text-gray-400 text-sm">Clique para adicionar uma descrição</p>
                  </div>
                </div>

                <!-- Checklist Section - Sempre visível -->
                <div class="mt-6">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <UIcon name="i-lucide-check-square" class="w-5 h-5 text-gray-500" />
                      <h3 class="font-medium text-gray-900 dark:text-gray-100">Checklist</h3>
                      <UBadge 
                        v-if="totalCount > 0"
                        :label="`${completedCount}/${totalCount}`"
                        size="xs"
                        :color="checklistProgress === 100 ? 'success' : 'neutral'"
                        variant="subtle"
                      />
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div v-if="totalCount > 0" class="mb-4">
                    <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso</span>
                      <span>{{ checklistProgress }}%</span>
                    </div>
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        class="h-full transition-all duration-300 rounded-full"
                        :class="checklistProgress === 100 ? 'bg-green-500' : 'bg-primary-500'"
                        :style="{ width: `${checklistProgress}%` }"
                      />
                    </div>
                  </div>

                  <!-- Add Item -->
                  <div class="flex items-center gap-2 mb-3">
                    <UInput
                      v-model="newChecklistItem"
                      placeholder="Adicionar item..."
                      class="flex-1"
                      @keydown="handleChecklistKeydown"
                    />
                    <UButton
                      icon="i-lucide-plus"
                      color="primary"
                      variant="soft"
                      :loading="addingChecklistItem"
                      :disabled="!newChecklistItem.trim()"
                      @click="handleAddChecklistItem"
                    />
                  </div>

                  <!-- Checklist Items -->
                  <div v-if="checklistsLoading" class="flex justify-center py-4">
                    <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin text-gray-400" />
                  </div>

                  <div v-else-if="checklists.length === 0" class="text-center py-6 text-gray-400">
                    <UIcon name="i-lucide-list-checks" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p class="text-sm">Nenhum item na checklist</p>
                  </div>

                  <div v-else class="space-y-1">
                    <div
                      v-for="item in checklists"
                      :key="item.uuid"
                      class="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <!-- Checkbox -->
                      <button
                        @click="handleToggleChecklistItem(item)"
                        class="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5"
                        :class="item.is_completed 
                          ? 'bg-green-500 border-green-500 text-white' 
                          : 'border-gray-300 dark:border-gray-600 hover:border-primary-500'"
                      >
                        <UIcon v-if="item.is_completed" name="i-lucide-check" class="w-3 h-3" />
                      </button>

                      <!-- Content Area -->
                      <div class="flex-1 min-w-0">
                        <!-- Title (Edit Mode) -->
                        <div v-if="editingChecklistUuid === item.uuid" class="flex items-center gap-2">
                          <UInput
                            v-model="editingChecklistTitle"
                            class="flex-1"
                            autofocus
                            @keydown="handleEditChecklistKeydown"
                          />
                          <UButton
                            icon="i-lucide-check"
                            size="xs"
                            color="success"
                            variant="soft"
                            @click="saveEditingChecklistItem"
                          />
                          <UButton
                            icon="i-lucide-x"
                            size="xs"
                            color="neutral"
                            variant="soft"
                            @click="cancelEditingChecklistItem"
                          />
                        </div>

                        <!-- Title (View Mode) -->
                        <div v-else>
                          <span
                            class="text-sm cursor-pointer"
                            :class="item.is_completed 
                              ? 'text-gray-400 line-through' 
                              : 'text-gray-700 dark:text-gray-300'"
                            @click="startEditingChecklistItem(item)"
                          >
                            {{ item.title }}
                          </span>
                          
                          <!-- Blocking Task Badge -->
                          <div v-if="item.blocking_task" class="flex items-center gap-1.5 mt-1">
                            <UIcon 
                              :name="item.is_blocking_task_completed ? 'i-lucide-check-circle' : 'i-lucide-link'" 
                              class="w-3.5 h-3.5"
                              :class="item.is_blocking_task_completed ? 'text-green-500' : 'text-orange-500'"
                            />
                            <span 
                              class="text-xs"
                              :class="item.is_blocking_task_completed 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-orange-600 dark:text-orange-400'"
                            >
                              {{ item.is_blocking_task_completed ? 'Concluído:' : 'Aguardando:' }}
                            </span>
                            <span class="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                              {{ item.blocking_task.title }}
                            </span>
                            <UButton
                              icon="i-lucide-x"
                              size="xs"
                              color="neutral"
                              variant="ghost"
                              class="!p-0 !h-4 !w-4"
                              title="Remover vínculo"
                              @click.stop="handleUnlinkBlockingTask(item.uuid)"
                            />
                          </div>
                        </div>
                      </div>

                      <!-- Actions -->
                      <div class="flex items-center gap-1">
                        <UButton
                          icon="i-lucide-link"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          title="Vincular tarefa"
                          @click="openLinkTaskModal(item.uuid)"
                        />
                        <UButton
                          icon="i-lucide-pencil"
                          size="xs"
                          color="neutral"
                          variant="ghost"
                          @click="startEditingChecklistItem(item)"
                        />
                        <UButton
                          icon="i-lucide-trash-2"
                          size="xs"
                          color="error"
                          variant="ghost"
                          @click="handleDeleteChecklistItem(item.uuid)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Messages Tab -->
              <div v-if="activeTab === 'messages'" class="flex flex-col h-full">
                <!-- Add Comment -->
                <div class="p-4 border-b border-gray-200 dark:border-gray-700">
                  <RichTextEditor
                    v-model="newComment"
                    placeholder="Adicione uma mensagem..."
                    toolbar="minimal"
                    height="100px"
                    :enable-mentions="true"
                    :members="members"
                  />
                  <div class="flex items-center justify-between mt-2">
                    <p class="text-xs text-gray-400">Use a barra de ferramentas para formatar</p>
                    <UButton
                      icon="i-lucide-send"
                      color="primary"
                      :loading="addingComment"
                      :disabled="isCommentEmpty"
                      @click="handleAddComment"
                    >
                      Enviar
                    </UButton>
                  </div>
                </div>

                <!-- Comments List -->
                <div class="flex-1 overflow-y-auto p-4 space-y-4">
                  <div v-if="commentsLoading" class="flex justify-center py-8">
                    <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
                  </div>

                  <div v-else-if="comments.length === 0" class="text-center py-8 text-gray-500">
                    <UIcon name="i-lucide-message-circle" class="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma mensagem ainda</p>
                    <p class="text-sm">Seja o primeiro a comentar!</p>
                  </div>

                  <template v-else>
                    <div
                      v-for="comment in comments"
                      :key="comment.uuid"
                      class="space-y-3"
                    >
                      <!-- Comentário Principal -->
                      <div class="group flex gap-3">
                        <UAvatar
                          :alt="comment.user?.name || 'Usuário'"
                          size="sm"
                          class="flex-shrink-0"
                        />
                        <div class="flex-1 min-w-0">
                          <!-- Header do comentário -->
                          <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-medium text-sm text-gray-900 dark:text-gray-100">
                              {{ comment.user?.name || 'Usuário' }}
                            </span>
                            <span class="text-xs text-gray-400">
                              {{ formatCommentDate(comment.created_at) }}
                            </span>
                            
                            <!-- Ações do comentário -->
                            <div class="flex items-center gap-1 ml-auto">
                              <UButton
                                icon="i-lucide-reply"
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                @click="startReply(comment.uuid)"
                                title="Responder"
                              />
                              <UButton
                                icon="i-lucide-smile"
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                @click="toggleEmojiPicker(comment.uuid)"
                                title="Reagir"
                              />
                              <UButton
                                v-if="isCommentOwner(comment)"
                                icon="i-lucide-pencil"
                                size="xs"
                                variant="ghost"
                                color="neutral"
                                @click="startEditingComment(comment)"
                                title="Editar"
                              />
                              <UButton
                                v-if="isCommentOwner(comment)"
                                icon="i-lucide-trash-2"
                                size="xs"
                                variant="ghost"
                                color="error"
                                @click="handleDeleteComment(comment.uuid)"
                                title="Excluir"
                              />
                            </div>
                          </div>
                          
                          <!-- Conteúdo do comentário (modo edição) -->
                          <div v-if="editingCommentUuid === comment.uuid" class="mt-2">
                            <RichTextEditor
                              v-model="editingCommentContent"
                              toolbar="minimal"
                              height="100px"
                              :enable-mentions="true"
                              :members="members"
                            />
                            <div class="flex items-center gap-2 mt-2">
                              <UButton
                                size="xs"
                                color="primary"
                                @click="saveEditingComment"
                              >
                                Salvar
                              </UButton>
                              <UButton
                                size="xs"
                                variant="ghost"
                                @click="cancelEditingComment"
                              >
                                Cancelar
                              </UButton>
                            </div>
                          </div>
                          
                          <!-- Conteúdo do comentário (modo visualização) -->
                          <div 
                            v-else
                            class="text-sm text-gray-700 dark:text-gray-300 mt-1 prose prose-sm dark:prose-invert max-w-none"
                            v-html="comment.content"
                          />
                          
                          <!-- Emoji Picker -->
                          <div 
                            v-if="showEmojiPicker === comment.uuid" 
                            class="flex flex-wrap gap-1 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                          >
                            <button
                              v-for="emoji in availableEmojis"
                              :key="emoji"
                              @click="handleToggleReaction(comment.uuid, emoji)"
                              class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-lg"
                              :class="{ 'bg-primary-100 dark:bg-primary-900': hasUserReacted(comment, emoji) }"
                            >
                              {{ emoji }}
                            </button>
                          </div>
                          
                          <!-- Reações -->
                          <div v-if="comment.grouped_reactions?.length" class="flex flex-wrap gap-1 mt-2">
                            <button
                              v-for="reaction in comment.grouped_reactions"
                              :key="reaction.emoji"
                              @click="handleToggleReaction(comment.uuid, reaction.emoji)"
                              class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors"
                              :class="hasUserReacted(comment, reaction.emoji) 
                                ? 'bg-primary-100 dark:bg-primary-900 border-primary-300 dark:border-primary-700' 
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'"
                            >
                              <span>{{ reaction.emoji }}</span>
                              <span class="font-medium">{{ reaction.count }}</span>
                            </button>
                          </div>
                          
                          <!-- Formulário de Resposta -->
                          <div v-if="replyingToUuid === comment.uuid" class="mt-3 pl-4 border-l-2 border-primary-300 dark:border-primary-700">
                            <RichTextEditor
                              v-model="replyContent"
                              placeholder="Escreva sua resposta..."
                              toolbar="minimal"
                              height="80px"
                              :enable-mentions="true"
                              :members="members"
                            />
                            <div class="flex items-center gap-2 mt-2">
                              <UButton
                                size="xs"
                                color="primary"
                                :loading="addingComment"
                                :disabled="isReplyEmpty"
                                @click="handleReply(comment.uuid)"
                              >
                                Responder
                              </UButton>
                              <UButton
                                size="xs"
                                variant="ghost"
                                @click="cancelReply"
                              >
                                Cancelar
                              </UButton>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Respostas -->
                      <div v-if="comment.replies?.length" class="ml-10 space-y-3">
                        <div
                          v-for="reply in comment.replies"
                          :key="reply.uuid"
                          class="group flex gap-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                        >
                          <UAvatar
                            :alt="reply.user?.name || 'Usuário'"
                            size="xs"
                            class="flex-shrink-0"
                          />
                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-medium text-xs text-gray-900 dark:text-gray-100">
                                {{ reply.user?.name || 'Usuário' }}
                              </span>
                              <span class="text-xs text-gray-400">
                                {{ formatCommentDate(reply.created_at) }}
                              </span>
                              
                              <!-- Ações da resposta -->
                              <div class="flex items-center gap-1 ml-auto">
                                <UButton
                                  icon="i-lucide-smile"
                                  size="xs"
                                  variant="ghost"
                                  color="neutral"
                                  @click="toggleEmojiPicker(reply.uuid)"
                                />
                                <UButton
                                  v-if="isCommentOwner(reply)"
                                  icon="i-lucide-pencil"
                                  size="xs"
                                  variant="ghost"
                                  color="neutral"
                                  @click="startEditingComment(reply)"
                                />
                                <UButton
                                  v-if="isCommentOwner(reply)"
                                  icon="i-lucide-trash-2"
                                  size="xs"
                                  variant="ghost"
                                  color="error"
                                  @click="handleDeleteComment(reply.uuid)"
                                />
                              </div>
                            </div>
                            
                            <!-- Conteúdo da resposta (modo edição) -->
                            <div v-if="editingCommentUuid === reply.uuid" class="mt-2">
                              <RichTextEditor
                                v-model="editingCommentContent"
                                toolbar="minimal"
                                height="80px"
                                :enable-mentions="true"
                                :members="members"
                              />
                              <div class="flex items-center gap-2 mt-2">
                                <UButton
                                  size="xs"
                                  color="primary"
                                  @click="saveEditingComment"
                                >
                                  Salvar
                                </UButton>
                                <UButton
                                  size="xs"
                                  variant="ghost"
                                  @click="cancelEditingComment"
                                >
                                  Cancelar
                                </UButton>
                              </div>
                            </div>
                            
                            <!-- Conteúdo da resposta (modo visualização) -->
                            <div 
                              v-else
                              class="text-xs text-gray-700 dark:text-gray-300 mt-1 prose prose-xs dark:prose-invert max-w-none"
                              v-html="reply.content"
                            />
                            
                            <!-- Emoji Picker para resposta -->
                            <div 
                              v-if="showEmojiPicker === reply.uuid" 
                              class="flex flex-wrap gap-1 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg"
                            >
                              <button
                                v-for="emoji in availableEmojis"
                                :key="emoji"
                                @click="handleToggleReaction(reply.uuid, emoji)"
                                class="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                :class="{ 'bg-primary-100 dark:bg-primary-900': hasUserReacted(reply, emoji) }"
                              >
                                {{ emoji }}
                              </button>
                            </div>
                            
                            <!-- Reações da resposta -->
                            <div v-if="reply.grouped_reactions?.length" class="flex flex-wrap gap-1 mt-2">
                              <button
                                v-for="reaction in reply.grouped_reactions"
                                :key="reaction.emoji"
                                @click="handleToggleReaction(reply.uuid, reaction.emoji)"
                                class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors"
                                :class="hasUserReacted(reply, reaction.emoji) 
                                  ? 'bg-primary-100 dark:bg-primary-900 border-primary-300 dark:border-primary-700' 
                                  : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'"
                              >
                                <span>{{ reaction.emoji }}</span>
                                <span class="font-medium">{{ reaction.count }}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Timeline/History Tab -->
              <div v-if="activeTab === 'timeline'" class="h-full">
                <TasksTaskTimeline :task-uuid="task.uuid" />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <UButton
            variant="ghost"
            @click="handleClose"
          >
            Fechar
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Link Task Modal -->
  <UModal
    v-model:open="linkTaskModalOpen"
    class="max-w-lg"
  >
    <template #content>
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Vincular Tarefa
          </h3>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="linkTaskModalOpen = false"
          />
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Busque e selecione uma tarefa para vincular como impedimento. Quando essa tarefa for concluída, o item será marcado com um check verde.
        </p>

        <UInput
          v-model="searchTaskQuery"
          placeholder="Buscar tarefa pelo nome ou código..."
          icon="i-lucide-search"
          class="mb-4"
          @input="handleSearchTaskInput"
        />

        <div class="max-h-64 overflow-y-auto">
          <div v-if="searchingTasks" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
          </div>

          <div v-else-if="searchedTasks.length === 0 && searchTaskQuery" class="text-center py-4 text-gray-500">
            <p class="text-sm">Nenhuma tarefa encontrada</p>
          </div>

          <div v-else-if="searchedTasks.length > 0" class="space-y-2">
            <button
              v-for="searchTask in searchedTasks"
              :key="searchTask.uuid"
              class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              @click="handleLinkBlockingTask(searchTask)"
            >
              <div class="flex-shrink-0">
                <div 
                  v-if="searchTask.status?.is_completed"
                  class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-check" class="w-3 h-3 text-white" />
                </div>
                <div 
                  v-else
                  class="w-5 h-5 rounded-full border-2"
                  :style="{ borderColor: searchTask.status?.color || '#6b7280' }"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-gray-500">#{{ searchTask.code }}</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ searchTask.title }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span 
                    v-if="searchTask.status" 
                    class="text-xs px-1.5 py-0.5 rounded"
                    :style="{ 
                      backgroundColor: searchTask.status.color + '20', 
                      color: searchTask.status.color 
                    }"
                  >
                    {{ searchTask.status.name }}
                  </span>
                  <span v-if="searchTask.project" class="text-xs text-gray-500">
                    {{ searchTask.project.name }}
                  </span>
                </div>
              </div>
              <UIcon 
                v-if="searchTask.status?.is_completed"
                name="i-lucide-check-circle" 
                class="w-5 h-5 text-green-500 flex-shrink-0" 
              />
            </button>
          </div>

          <div v-else class="text-center py-4 text-gray-500">
            <UIcon name="i-lucide-search" class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">Digite para buscar tarefas</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- Blocker Modal (Adicionar Impedimentos na Tarefa) -->
  <UModal
    v-model:open="blockerModalOpen"
    class="max-w-lg"
  >
    <template #content>
      <div class="p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Adicionar Impedimento
          </h3>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="neutral"
            size="sm"
            @click="blockerModalOpen = false"
          />
        </div>

        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Selecione uma tarefa que impede a conclusão desta. Quando a tarefa bloqueadora for concluída, será exibido um indicador verde.
        </p>

        <UInput
          v-model="searchBlockerQuery"
          placeholder="Buscar tarefa pelo nome ou código..."
          icon="i-lucide-search"
          class="mb-4"
          @input="handleSearchBlockerInput"
        />

        <div class="max-h-64 overflow-y-auto">
          <div v-if="searchingBlockerTasks" class="flex justify-center py-4">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-gray-400" />
          </div>

          <div v-else-if="searchedBlockerTasks.length === 0" class="text-center py-4 text-gray-500">
            <p class="text-sm">Nenhuma tarefa encontrada</p>
          </div>

          <div v-else-if="searchedBlockerTasks.length > 0" class="space-y-2">
            <button
              v-for="blockerTask in searchedBlockerTasks"
              :key="blockerTask.uuid"
              class="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              :disabled="addingBlocker"
              @click="handleAddBlocker(blockerTask)"
            >
              <div class="flex-shrink-0">
                <div 
                  v-if="blockerTask.status?.is_completed"
                  class="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-check" class="w-3 h-3 text-white" />
                </div>
                <div 
                  v-else
                  class="w-5 h-5 rounded-full border-2"
                  :style="{ borderColor: blockerTask.status?.color || '#6b7280' }"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-mono text-gray-500">#{{ blockerTask.code }}</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ blockerTask.title }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span 
                    v-if="blockerTask.status" 
                    class="text-xs px-1.5 py-0.5 rounded"
                    :style="{ 
                      backgroundColor: blockerTask.status.color + '20', 
                      color: blockerTask.status.color 
                    }"
                  >
                    {{ blockerTask.status.name }}
                  </span>
                  <span v-if="blockerTask.project" class="text-xs text-gray-500">
                    {{ blockerTask.project.name }}
                  </span>
                </div>
              </div>
              <UIcon 
                v-if="blockerTask.status?.is_completed"
                name="i-lucide-check-circle" 
                class="w-5 h-5 text-green-500 flex-shrink-0" 
              />
              <UIcon 
                v-else
                name="i-lucide-plus-circle" 
                class="w-5 h-5 text-gray-400 flex-shrink-0" 
              />
            </button>
          </div>

          <div v-else class="text-center py-4 text-gray-500">
            <UIcon name="i-lucide-search" class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p class="text-sm">Digite para buscar tarefas</p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>