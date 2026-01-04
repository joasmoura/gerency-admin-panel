<script setup lang="ts">
import type { Task, TaskStatus } from '~/types'

const props = defineProps<{
  tasks: Task[]
  statuses: TaskStatus[]
  loading: boolean
}>()

const emit = defineEmits<{
  'task-click': [task: Task]
  'task-edit': [task: Task]
  'add-task': [statusId: number]
  'refresh': []
  'open-task': [taskUuid: string]
}>()

const { updateTaskStatus, updateTasksOrder, fetchKanbanTasks } = useTasks()

// Drag and drop state
const draggedTask = ref<Task | null>(null)
const dragOverColumn = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// Computed: tasks grouped by status
const tasksByStatus = computed(() => {
  const grouped: Record<number, Task[]> = {}
  
  // Initialize all statuses with empty arrays
  for (const status of props.statuses) {
    grouped[status.id] = []
  }
  
  // Group tasks by status
  for (const task of props.tasks) {
    const statusId = task.status_id || 0
    if (grouped[statusId]) {
      grouped[statusId].push(task)
    }
  }
  
  // Sort tasks by order within each group
  for (const statusId in grouped) {
    grouped[statusId]?.sort((a, b) => a.order - b.order)
  }
  
  return grouped
})

// Ordered statuses
const orderedStatuses = computed(() => {
  return [...props.statuses].sort((a, b) => a.order - b.order)
})

// Drag handlers
function handleDragStart(event: DragEvent, task: Task) {
  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.uuid)
  }
}

function handleDragOver(event: DragEvent, statusId: number, index?: number) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  dragOverColumn.value = statusId
  dragOverIndex.value = index ?? null
}

function handleDragLeave() {
  dragOverColumn.value = null
  dragOverIndex.value = null
}

async function handleDrop(event: DragEvent, statusId: number, index?: number) {
  event.preventDefault()
  
  if (!draggedTask.value) return
  
  const task = draggedTask.value
  const oldStatusId = task.status_id
  
  // Reset drag state
  draggedTask.value = null
  dragOverColumn.value = null
  dragOverIndex.value = null
  
  // Calculate new order
  const tasksInColumn = tasksByStatus.value[statusId] || []
  let newOrder = 0
  
  if (index !== undefined && index < tasksInColumn.length && tasksInColumn[index]) {
    newOrder = tasksInColumn[index].order
  } else if (tasksInColumn.length > 0) {
    const lastTask = tasksInColumn[tasksInColumn.length - 1]
    if (lastTask) {
      newOrder = lastTask.order + 1
    }
  }
  
  try {
    // Update task status
    await updateTaskStatus(task.uuid, statusId, newOrder)
    
    // Refresh kanban
    emit('refresh')
  } catch (error) {
    console.error('Erro ao mover tarefa:', error)
  }
}

function handleDragEnd() {
  draggedTask.value = null
  dragOverColumn.value = null
  dragOverIndex.value = null
}

// Get column color classes
function getColumnHeaderStyle(status: TaskStatus) {
  return {
    borderColor: status.color,
    backgroundColor: `${status.color}15`
  }
}

function getColumnDotColor(status: TaskStatus) {
  return { backgroundColor: status.color }
}
</script>

<template>
  <div class="h-full overflow-x-auto">
    <div class="flex gap-4 p-4 h-full min-w-max">
      <!-- Columns -->
      <div
        v-for="status in orderedStatuses"
        :key="status.id"
        class="flex flex-col w-80 min-w-80 bg-gray-50 dark:bg-gray-900 rounded-lg"
        :class="{ 'ring-2 ring-primary-500': dragOverColumn === status.id }"
        @dragover="handleDragOver($event, status.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, status.id)"
      >
        <!-- Column Header -->
        <div
          class="flex items-center justify-between p-3 border-b-2 rounded-t-lg"
          :style="getColumnHeaderStyle(status)"
        >
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-full"
              :style="getColumnDotColor(status)"
            ></span>
            <span class="font-medium text-sm">{{ status.name }}</span>
            <UBadge
              :label="String(tasksByStatus[status.id]?.length || 0)"
              size="xs"
              variant="subtle"
              color="neutral"
            />
          </div>
          <UButton
            icon="i-lucide-plus"
            size="xs"
            variant="ghost"
            @click="emit('add-task', status.id)"
          />
        </div>

        <!-- Column Content -->
        <div class="flex-1 overflow-y-auto p-2 space-y-2">
          <!-- Loading State -->
          <template v-if="loading && tasksByStatus[status.id]?.length === 0">
            <div
              v-for="i in 2"
              :key="i"
              class="bg-white dark:bg-gray-800 rounded-lg p-3 space-y-2"
            >
              <USkeleton class="h-4 w-full" />
              <USkeleton class="h-3 w-2/3" />
            </div>
          </template>

          <!-- Task Cards -->
          <TasksKanbanCard
            v-for="(task, index) in tasksByStatus[status.id]"
            :key="task.uuid"
            :task="task"
            :dragging="draggedTask?.uuid === task.uuid"
            draggable="true"
            @dragstart="handleDragStart($event, task)"
            @dragend="handleDragEnd"
            @dragover="handleDragOver($event, status.id, index)"
            @click="emit('task-click', task)"
            @edit="emit('task-edit', task)"
            @open-task="emit('open-task', $event)"
          />

          <!-- Empty State -->
          <div
            v-if="!loading && (tasksByStatus[status.id]?.length === 0)"
            class="flex flex-col items-center justify-center py-8 text-gray-400"
          >
            <UIcon name="i-lucide-inbox" class="w-10 h-10 mb-2 opacity-50" />
            <span class="text-sm">Nenhuma tarefa</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto {
  scrollbar-width: thin;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 2px;
}
</style>
