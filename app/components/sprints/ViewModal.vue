<script setup lang="ts">
import type { Sprint, Task, TaskStatus } from '~/types'

const props = defineProps<{
  sprint: Sprint
}>()

const emit = defineEmits<{
  edit: [sprint: Sprint]
  close: []
  updated: [sprint: Sprint]
  'open-task': [taskUuid: string]
}>()

const formModalOpen = ref(false)

const open = defineModel<boolean>('open', { default: false })

const { 
  fetchSprint, 
  startSprint, 
  completeSprint, 
  deleteSprint,
  addTasksToSprint,
  removeTasksFromSprint,
  fetchBacklog,
  statusOptions, 
  getStatusOption, 
  getSprintProgress, 
  isSprintOverdue, 
  getDaysRemaining 
} = useSprints()
const { taskStatuses, fetchAllTaskStatuses } = useTaskStatuses()
const { fetchTask } = useTasks()

const toast = useToast()

// Local state
const localSprint = ref<Sprint | null>(null)
const loading = ref(false)
const activeTab = ref('tasks')
const backlogTasks = ref<Task[]>([])
const loadingBacklog = ref(false)
const showBacklogModal = ref(false)
const selectedBacklogTasks = ref<string[]>([])

// Task view modal
const viewTaskModalOpen = ref(false)
const taskToView = ref<Task | null>(null)

// Tabs
const tabs = [
  { label: 'Tarefas', value: 'tasks', icon: 'i-lucide-list-todo' },
  { label: 'Estatísticas', value: 'stats', icon: 'i-lucide-bar-chart-2' }
]

// Load sprint data
async function loadSprintData() {
  loading.value = true
  try {
    const sprint = await fetchSprint(props.sprint.uuid)
    localSprint.value = sprint
  } catch (error) {
    console.error('Erro ao carregar sprint:', error)
  } finally {
    loading.value = false
  }
}

// Load backlog
async function loadBacklog() {
  loadingBacklog.value = true
  try {
    backlogTasks.value = await fetchBacklog()
  } catch (error) {
    console.error('Erro ao carregar backlog:', error)
  } finally {
    loadingBacklog.value = false
  }
}

// Open backlog modal
async function openBacklogModal() {
  await loadBacklog()
  selectedBacklogTasks.value = []
  showBacklogModal.value = true
}

// Add selected tasks to sprint
async function handleAddTasks() {
  if (selectedBacklogTasks.value.length === 0) return
  
  try {
    await addTasksToSprint(props.sprint.uuid, selectedBacklogTasks.value)
    showBacklogModal.value = false
    await loadSprintData()
    emit('updated', localSprint.value!)
  } catch (error) {
    console.error('Erro ao adicionar tarefas:', error)
  }
}

// Remove task from sprint
async function handleRemoveTask(taskUuid: string) {
  try {
    await removeTasksFromSprint(props.sprint.uuid, [taskUuid])
    await loadSprintData()
    emit('updated', localSprint.value!)
  } catch (error) {
    console.error('Erro ao remover tarefa:', error)
  }
}

// Start sprint
async function handleStartSprint() {
  try {
    const sprint = await startSprint(props.sprint.uuid)
    localSprint.value = sprint
    emit('updated', sprint)
  } catch (error) {
    console.error('Erro ao iniciar sprint:', error)
  }
}

// Complete sprint
async function handleCompleteSprint() {
  try {
    const sprint = await completeSprint(props.sprint.uuid)
    localSprint.value = sprint
    emit('updated', sprint)
  } catch (error) {
    console.error('Erro ao concluir sprint:', error)
  }
}

// Delete sprint
async function handleDeleteSprint() {
  if (!confirm('Tem certeza que deseja excluir esta sprint?')) return
  
  try {
    await deleteSprint(props.sprint.uuid)
    open.value = false
    emit('close')
  } catch (error) {
    console.error('Erro ao excluir sprint:', error)
  }
}

// Open task view modal
async function handleOpenTask(task: Task) {
  try {
    const fullTask = await fetchTask(task.uuid)
    if (fullTask) {
      taskToView.value = fullTask
      viewTaskModalOpen.value = true
    }
  } catch (error) {
    console.error('Erro ao abrir tarefa:', error)
  }
}

// Watch for sprint changes
watch(() => props.sprint, () => {
  loadSprintData()
}, { immediate: true })

// Watch for modal open
watch(open, async (isOpen) => {
  if (isOpen) {
    await fetchAllTaskStatuses()
  }
})

// Format date
function formatDate(date?: string): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Get task status color
function getTaskStatusColor(task: Task): string {
  if (task.status?.is_completed) return 'success'
  if (task.is_blocked) return 'error'
  if (task.due_date && new Date(task.due_date) < new Date() && !task.completed_at) return 'warning'
  return 'primary'
}

// Get priority color  
function getPriorityColor(priority: any): string {
  if (!priority) return 'neutral'
  const colorMap: Record<string, string> = {
    red: 'error',
    orange: 'warning', 
    yellow: 'warning',
    green: 'success',
    blue: 'info',
    gray: 'neutral'
  }
  return colorMap[priority.color] || 'neutral'
}

// Computed
const sprintData = computed(() => localSprint.value || props.sprint)
const sprintTasks = computed(() => sprintData.value?.tasks || [])
const sprintStats = computed(() => sprintData.value?.stats)

// Tasks grouped by status
const tasksByStatus = computed(() => {
  if (!sprintTasks.value.length) return new Map()
  
  const grouped = new Map<number, Task[]>()
  
  for (const task of sprintTasks.value) {
    const statusId = task.status_id || 0
    if (!grouped.has(statusId)) {
      grouped.set(statusId, [])
    }
    grouped.get(statusId)!.push(task)
  }
  
  return grouped
})
</script>

<template>
  <USlideover
    v-model:open="open"
    class="sm:max-w-3xl"
    @close="$emit('close')"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-layers" class="w-6 h-6 text-primary-500" />
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ sprintData.name }}
            </h2>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UBadge
            :color="getStatusOption(sprintData.status)?.color as any"
            variant="subtle"
            size="md"
          >
            <UIcon :name="getStatusOption(sprintData.status)?.icon" class="w-3 h-3 mr-1" />
            {{ getStatusOption(sprintData.status)?.label }}
          </UBadge>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-6 p-4">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-gray-400" />
        </div>

        <template v-else>
          <!-- Sprint Info -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <!-- Dates -->
              <div>
                <p class="text-xs text-gray-500 mb-1">Início</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ formatDate(sprintData.start_date) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 mb-1">Término</p>
                <p 
                  class="text-sm font-medium"
                  :class="isSprintOverdue(sprintData) ? 'text-red-500' : 'text-gray-900 dark:text-white'"
                >
                  {{ formatDate(sprintData.end_date) }}
                </p>
              </div>
              <!-- Progress -->
              <div>
                <p class="text-xs text-gray-500 mb-1">Progresso</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ getSprintProgress(sprintData) }}%
                </p>
              </div>
              <!-- Tasks -->
              <div>
                <p class="text-xs text-gray-500 mb-1">Tarefas</p>
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ sprintData.completed_tasks_count || 0 }}/{{ sprintData.tasks_count || 0 }}
                </p>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="mt-4">
              <UProgress
                :model-value="getSprintProgress(sprintData)"
                :color="getSprintProgress(sprintData) === 100 ? 'success' : 'primary'"
                size="sm"
              />
            </div>

            <!-- Goal -->
            <div v-if="sprintData.goal" class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p class="text-xs text-gray-500 mb-1">Objetivo</p>
              <p class="text-sm text-gray-700 dark:text-gray-300">{{ sprintData.goal }}</p>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2">
            <UButton
              v-if="sprintData.status === 'planning'"
              color="primary"
              icon="i-lucide-play"
              @click="handleStartSprint"
            >
              Iniciar Sprint
            </UButton>
            <UButton
              v-if="sprintData.status === 'active'"
              color="success"
              icon="i-lucide-check-circle"
              @click="handleCompleteSprint"
            >
              Concluir Sprint
            </UButton>
            <UButton
              variant="soft"
              color="primary"
              icon="i-lucide-plus"
              @click="openBacklogModal"
            >
              Adicionar Tarefas
            </UButton>
            <div class="flex-1" />
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-pencil"
              @click="formModalOpen = true"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              @click="handleDeleteSprint"
            />
          </div>

          <!-- Tabs -->
          <UTabs v-model="activeTab" :items="tabs" class="w-full" />

          <!-- Tasks Tab -->
          <div v-if="activeTab === 'tasks'">
            <!-- Empty state -->
            <div v-if="sprintTasks.length === 0" class="text-center py-12">
              <UIcon name="i-lucide-inbox" class="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Nenhuma tarefa na sprint
              </h3>
              <p class="text-gray-500 mb-4">
                Adicione tarefas do backlog para começar.
              </p>
              <UButton
                color="primary"
                icon="i-lucide-plus"
                @click="openBacklogModal"
              >
                Adicionar Tarefas
              </UButton>
            </div>

            <!-- Tasks grouped by status -->
            <div v-else class="space-y-6">
              <div v-for="status in taskStatuses" :key="status.id">
                <template v-if="tasksByStatus.get(status.id)?.length">
                  <div class="flex items-center gap-2 mb-3">
                    <div 
                      class="w-3 h-3 rounded-full" 
                      :style="{ backgroundColor: status.color }"
                    />
                    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {{ status.name }}
                    </h4>
                    <UBadge color="neutral" variant="subtle" size="xs">
                      {{ tasksByStatus.get(status.id)?.length }}
                    </UBadge>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="task in tasksByStatus.get(status.id)"
                      :key="task.uuid"
                      class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 transition-colors cursor-pointer"
                      @click="handleOpenTask(task)"
                    >
                      <!-- Status indicator -->
                      <div 
                        class="w-2 h-2 rounded-full flex-shrink-0" 
                        :style="{ backgroundColor: task.status?.color || '#94a3b8' }"
                      />
                      
                      <!-- Task info -->
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs text-gray-400 font-mono">#{{ task.code }}</span>
                          <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {{ task.title }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                          <UBadge 
                            v-if="task.priority" 
                            :color="getPriorityColor(task.priority) as any" 
                            variant="subtle" 
                            size="xs"
                          >
                            {{ task.priority.name }}
                          </UBadge>
                          <UBadge 
                            v-if="task.type" 
                            color="neutral" 
                            variant="subtle" 
                            size="xs"
                          >
                            {{ task.type.name }}
                          </UBadge>
                          <span 
                            v-if="task.due_date" 
                            class="text-xs"
                            :class="task.due_date && new Date(task.due_date) < new Date() && !task.completed_at ? 'text-red-500' : 'text-gray-400'"
                          >
                            {{ formatDate(task.due_date) }}
                          </span>
                        </div>
                      </div>

                      <!-- Responsible -->
                      <UAvatar
                        v-if="task.responsible"
                        :alt="task.responsible.name"
                        size="xs"
                      />

                      <!-- Actions -->
                      <UButton
                        variant="ghost"
                        color="error"
                        icon="i-lucide-x"
                        size="xs"
                        @click.stop="handleRemoveTask(task.uuid)"
                      />
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Stats Tab -->
          <div v-if="activeTab === 'stats' && sprintStats">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <UCard>
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ sprintStats.total_tasks }}
                  </p>
                  <p class="text-sm text-gray-500">Total de Tarefas</p>
                </div>
              </UCard>
              <UCard>
                <div class="text-center">
                  <p class="text-2xl font-bold text-green-600">
                    {{ sprintStats.completed_tasks }}
                  </p>
                  <p class="text-sm text-gray-500">Concluídas</p>
                </div>
              </UCard>
              <UCard>
                <div class="text-center">
                  <p class="text-2xl font-bold text-red-600">
                    {{ sprintStats.overdue_tasks }}
                  </p>
                  <p class="text-sm text-gray-500">Atrasadas</p>
                </div>
              </UCard>
              <UCard>
                <div class="text-center">
                  <p class="text-2xl font-bold text-orange-600">
                    {{ sprintStats.blocked_tasks }}
                  </p>
                  <p class="text-sm text-gray-500">Bloqueadas</p>
                </div>
              </UCard>
            </div>

            <div class="grid grid-cols-2 gap-4 mt-4">
              <UCard>
                <div class="text-center">
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">
                    {{ sprintStats.total_estimated_hours }}h
                  </p>
                  <p class="text-sm text-gray-500">Horas Estimadas</p>
                </div>
              </UCard>
              <UCard>
                <div class="text-center">
                  <p class="text-2xl font-bold text-primary-600">
                    {{ sprintStats.total_worked_hours }}h
                  </p>
                  <p class="text-sm text-gray-500">Horas Trabalhadas</p>
                </div>
              </UCard>
            </div>
          </div>
        </template>
      </div>

      <SprintsFormModal
            v-model:open="formModalOpen"
            :sprint="sprintData"
            @saved="loadSprintData"
        />
    
        <!-- Task View Modal -->
        <TasksViewModal
          v-if="taskToView"
          v-model:open="viewTaskModalOpen"
          :task="taskToView"
          @updated="loadSprintData(); emit('updated', sprintData)"
        />

        <!-- Backlog Modal -->
        <UModal
        v-model:open="showBacklogModal"
        class="sm:max-w-2xl"
        >
        <template #header>
            <h3 class="text-lg font-semibold">Adicionar Tarefas do Backlog</h3>
        </template>
        <template #body>
            <div v-if="loadingBacklog" class="flex justify-center py-8">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin" />
            </div>
            <div v-else-if="backlogTasks.length === 0" class="text-center py-8">
            <UIcon name="i-lucide-inbox" class="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p class="text-gray-500">Não há tarefas disponíveis no backlog.</p>
            </div>
            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
            <div
                v-for="task in backlogTasks"
                :key="task.uuid"
                class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                @click="() => {
                const idx = selectedBacklogTasks.indexOf(task.uuid)
                if (idx > -1) {
                    selectedBacklogTasks.splice(idx, 1)
                } else {
                    selectedBacklogTasks.push(task.uuid)
                }
                }"
            >
                <UCheckbox
                :model-value="selectedBacklogTasks.includes(task.uuid)"
                @click.stop
                />
                <div 
                class="w-2 h-2 rounded-full flex-shrink-0" 
                :style="{ backgroundColor: task.status?.color || '#94a3b8' }"
                />
                <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-mono">#{{ task.code }}</span>
                    <span class="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {{ task.title }}
                    </span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <span v-if="task.project" class="text-xs text-gray-500">
                    {{ task.project.name }}
                    </span>
                </div>
                </div>
            </div>
            </div>
        </template>

        <template #footer>
            <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">
                {{ selectedBacklogTasks.length }} tarefa(s) selecionada(s)
            </span>
            <div class="flex gap-3">
                <UButton
                variant="ghost"
                color="neutral"
                @click="showBacklogModal = false"
                >
                Cancelar
                </UButton>
                <UButton
                color="primary"
                :disabled="selectedBacklogTasks.length === 0"
                @click="handleAddTasks"
                >
                Adicionar Tarefas
                </UButton>
            </div>
            </div>
        </template>
        </UModal>
    </template>    
  </USlideover>
</template>
