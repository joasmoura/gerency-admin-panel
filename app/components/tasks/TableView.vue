<script setup lang="ts">
import type { Task, TaskStatus } from '~/types'

const props = defineProps<{
  tasks: Task[]
  statuses: TaskStatus[]
  loading: boolean
}>()

const emit = defineEmits<{
  taskClick: [task: Task]
  taskEdit: [task: Task]
  addTask: []
  refresh: []
  openTask: [taskUuid: string]
}>()

// Flatten tasks from all statuses into a single array
const flatTasks = computed(() => {
  const allTasks: Task[] = []
  props.statuses.forEach(status => {
    const statusTasks = props.tasks.filter(t => t.status_id === status.id)
    allTasks.push(...statusTasks)
  })
  return allTasks
})

// Table columns
const columns = [
  { key: 'code', label: 'Código', class: 'w-24' },
  { key: 'title', label: 'Título' },
  { key: 'project', label: 'Projeto', class: 'w-40' },
  { key: 'status', label: 'Status', class: 'w-32' },
  { key: 'priority', label: 'Prioridade', class: 'w-28' },
  { key: 'type', label: 'Tipo', class: 'w-28' },
  { key: 'responsible', label: 'Responsável', class: 'w-40' },
  { key: 'due_date', label: 'Vencimento', class: 'w-32' },
  { key: 'progress', label: 'Progresso', class: 'w-28' },
  { key: 'actions', label: '', class: 'w-20' }
]

// Helpers
function isOverdue(task: Task): boolean {
  if (!task.due_date || task.completed_at) return false
  return new Date(task.due_date) < new Date()
}

function formatDueDate(dueDate?: string): string {
  if (!dueDate) return '-'
  const date = new Date(dueDate)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Amanhã'
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }
}

function getTypeIcon(task: Task): string {
  const icons: Record<string, string> = {
    'Feature': 'i-lucide-sparkles',
    'Bug': 'i-lucide-bug',
    'Melhoria': 'i-lucide-trending-up',
    'Tarefa': 'i-lucide-check-square'
  }
  return task.type?.icon || icons[task.type?.name || ''] || 'i-lucide-circle'
}

function getChecklistProgress(task: Task): { completed: number; total: number; percent: number } {
  const total = task.checklists?.length || 0
  const completed = task.checklists?.filter(c => c.is_completed).length || 0
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, percent }
}

function handleRowClick(task: Task) {
  emit('taskClick', task)
}

function handleEdit(task: Task, event: MouseEvent) {
  event.stopPropagation()
  emit('taskEdit', task)
}
</script>

<template>
  <div class="h-full overflow-auto">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Empty State -->
    <div v-else-if="flatTasks.length === 0" class="flex items-center justify-center h-64">
      <div class="text-center text-gray-500">
        <UIcon name="i-lucide-inbox" class="w-16 h-16 mx-auto mb-4 opacity-30" />
        <p class="mb-4">Nenhuma tarefa encontrada</p>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="emit('addTask')"
        >
          Criar primeira tarefa
        </UButton>
      </div>
    </div>

    <!-- Table -->
    <table v-else class="w-full">
      <thead class="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <th
            v-for="column in columns"
            :key="column.key"
            class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            :class="column.class"
          >
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
        <tr
          v-for="task in flatTasks"
          :key="task.uuid"
          class="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
          :class="{
            'bg-yellow-50/50 dark:bg-yellow-900/10': task.is_blocked,
            'bg-red-50/30 dark:bg-red-900/10': isOverdue(task)
          }"
          @click="handleRowClick(task)"
        >
          <!-- Code -->
          <td class="px-4 py-3">
            <span class="font-mono text-sm text-gray-600 dark:text-gray-400">
              #{{ task.code }}
            </span>
          </td>

          <!-- Title -->
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <!-- Blocked indicator -->
              <UTooltip v-if="task.is_blocked" :text="task.block_reason || 'Tarefa bloqueada'">
                <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-yellow-500 flex-shrink-0" />
              </UTooltip>
              <span class="font-medium text-gray-900 dark:text-gray-100 truncate max-w-md">
                {{ task.title }}
              </span>
              <!-- Blockers count -->
              <UBadge
                v-if="task.blockers && task.blockers.length > 0"
                variant="subtle"
                color="warning"
                size="xs"
              >
                <UIcon name="i-lucide-link" class="w-3 h-3 mr-1" />
                {{ task.blockers.length }}
              </UBadge>
            </div>
          </td>

          <!-- Project -->
          <td class="px-4 py-3">
            <span v-if="task.project" class="text-sm text-gray-600 dark:text-gray-400 truncate block max-w-[140px]">
              {{ task.project.name }}
            </span>
            <span v-else class="text-sm text-gray-400">-</span>
          </td>

          <!-- Status -->
          <td class="px-4 py-3">
            <UBadge
              v-if="task.status"
              :style="{ backgroundColor: task.status.color + '20', color: task.status.color }"
              variant="subtle"
              size="sm"
            >
              {{ task.status.name }}
            </UBadge>
          </td>

          <!-- Priority -->
          <td class="px-4 py-3">
            <div v-if="task.priority" class="flex items-center gap-2">
              <span
                class="w-2 h-2 rounded-full flex-shrink-0"
                :style="{ backgroundColor: task.priority.color }"
              />
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ task.priority.name }}
              </span>
            </div>
            <span v-else class="text-sm text-gray-400">-</span>
          </td>

          <!-- Type -->
          <td class="px-4 py-3">
            <div v-if="task.type" class="flex items-center gap-2">
              <UIcon :name="getTypeIcon(task)" class="w-4 h-4 text-gray-500" />
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ task.type.name }}
              </span>
            </div>
            <span v-else class="text-sm text-gray-400">-</span>
          </td>

          <!-- Responsible -->
          <td class="px-4 py-3">
            <div v-if="task.responsible" class="flex items-center gap-2">
              <UAvatar
                :alt="task.responsible.name"
                size="2xs"
              />
              <span class="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px]">
                {{ task.responsible.name }}
              </span>
            </div>
            <span v-else class="text-sm text-gray-400">-</span>
          </td>

          <!-- Due Date -->
          <td class="px-4 py-3">
            <div v-if="task.due_date" class="flex items-center gap-1">
              <UIcon
                name="i-lucide-calendar"
                class="w-4 h-4"
                :class="isOverdue(task) ? 'text-red-500' : 'text-gray-400'"
              />
              <span
                class="text-sm"
                :class="isOverdue(task) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'"
              >
                {{ formatDueDate(task.due_date) }}
              </span>
            </div>
            <span v-else class="text-sm text-gray-400">-</span>
          </td>

          <!-- Progress (Checklists) -->
          <td class="px-4 py-3">
            <div v-if="task.checklists && task.checklists.length > 0" class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-500 transition-all duration-300"
                  :style="{ width: getChecklistProgress(task).percent + '%' }"
                />
              </div>
              <span class="text-xs text-gray-500">
                {{ getChecklistProgress(task).completed }}/{{ getChecklistProgress(task).total }}
              </span>
            </div>
            <span v-else class="text-sm text-gray-400">-</span>
          </td>

          <!-- Actions -->
          <td class="px-4 py-3">
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <UTooltip text="Editar tarefa">
                <UButton
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-pencil"
                  @click="handleEdit(task, $event)"
                />
              </UTooltip>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Total count -->
    <div class="sticky bottom-0 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-500">
      {{ flatTasks.length }} tarefa{{ flatTasks.length !== 1 ? 's' : '' }} encontrada{{ flatTasks.length !== 1 ? 's' : '' }}
    </div>
  </div>
</template>

<style scoped>
tr:hover td:last-child > div {
  opacity: 1;
}
</style>
