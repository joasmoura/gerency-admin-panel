<script setup lang="ts">
import type { Task, TaskStatus } from '~/types'
import { format, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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

// Refs
const ganttContainer = ref<HTMLElement | null>(null)
const ganttInstance = ref<any>(null)

// View mode
type ViewMode = 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month' | 'Year'
const viewMode = ref<ViewMode>('Day')

const viewModeOptions = [
  { label: '¼ Dia', value: 'Quarter Day' },
  { label: '½ Dia', value: 'Half Day' },
  { label: 'Dia', value: 'Day' },
  { label: 'Semana', value: 'Week' },
  { label: 'Mês', value: 'Month' }
]

// Flatten tasks - use all tasks directly, sorted by date
const flatTasks = computed(() => {
  // Use tasks directly instead of filtering by status
  const allTasks = [...props.tasks]
  
  return allTasks.sort((a, b) => {
    const dateA = a.due_date || a.created_at
    const dateB = b.due_date || b.created_at
    return new Date(dateA).getTime() - new Date(dateB).getTime()
  })
})

// Convert tasks to Frappe Gantt format
const ganttTasks = computed(() => {
  const tasks = flatTasks.value.map(task => {
    const startDate = new Date(task.created_at)
    const endDate = task.due_date ? new Date(task.due_date) : addDays(startDate, 1)
    
    // Calculate progress from checklists
    let progress = 0
    if (task.checklists && task.checklists.length > 0) {
      const completed = task.checklists.filter(c => c.is_completed).length
      progress = Math.round((completed / task.checklists.length) * 100)
    }

    // Build dependencies from blockers - use empty string for no deps
    const dependencies = ''

    return {
      id: task.uuid,
      name: `#${task.code} ${task.title}`,
      start: format(startDate, 'yyyy-MM-dd'),
      end: format(endDate, 'yyyy-MM-dd'),
      progress,
      dependencies,
      custom_class: getTaskClass(task)
    }
  })
  
  console.log('ganttTasks computed:', tasks)
  return tasks
})

// Get CSS class based on task state - frappe-gantt only accepts a single class name
function getTaskClass(task: Task): string {
  // Priority: blocked > overdue > completed > status
  if (task.is_blocked) {
    return 'gantt-task-blocked'
  }
  
  if (task.due_date && !task.completed_at && new Date(task.due_date) < new Date()) {
    return 'gantt-task-overdue'
  }
  
  if (task.completed_at) {
    return 'gantt-task-completed'
  }

  // Default: use status-based class
  if (task.status) {
    return `gantt-status-${task.status.id}`
  }

  return 'gantt-task-default'
}

// Find original task by ID
function findTaskByUuid(uuid: string): Task | undefined {
  return flatTasks.value.find(t => t.uuid === uuid)
}

// Initialize Frappe Gantt
async function initGantt() {
  console.log('initGantt called', {
    container: ganttContainer.value,
    tasksCount: ganttTasks.value.length,
    tasks: ganttTasks.value
  })
  
  if (!ganttContainer.value) {
    console.warn('Gantt container not found')
    return
  }
  
  if (ganttTasks.value.length === 0) {
    console.warn('No tasks to display')
    return
  }

  // Dynamically import Frappe Gantt (client-side only)
  const { default: Gantt } = await import('frappe-gantt')
  console.log('Frappe Gantt imported successfully')

  // Destroy existing instance
  if (ganttInstance.value) {
    ganttContainer.value.innerHTML = ''
  }

  // Create new instance
  try {
    ganttInstance.value = new Gantt(ganttContainer.value, ganttTasks.value, {
      view_mode: viewMode.value,
      date_format: 'YYYY-MM-DD',
      language: 'pt-br',
      popup_trigger: 'click',
      custom_popup_html: (task: any) => {
      const originalTask = findTaskByUuid(task.id)
      if (!originalTask) return ''

      const statusColor = originalTask.status?.color || '#6366f1'
      const priorityColor = originalTask.priority?.color || '#94a3b8'
      const isOverdue = originalTask.due_date && !originalTask.completed_at && new Date(originalTask.due_date) < new Date()
      
      return `
        <div class="gantt-popup">
          <div class="gantt-popup-header" style="background: ${statusColor}">
            <span class="gantt-popup-code">#${originalTask.code}</span>
            <span class="gantt-popup-status">${originalTask.status?.name || 'Sem status'}</span>
          </div>
          <div class="gantt-popup-body">
            <h3 class="gantt-popup-title">${originalTask.title}</h3>
            
            <div class="gantt-popup-info">
              <div class="gantt-popup-row">
                <span class="gantt-popup-label">Período:</span>
                <span class="gantt-popup-value">${format(new Date(originalTask.created_at), 'dd/MM/yyyy')} → ${originalTask.due_date ? format(new Date(originalTask.due_date), 'dd/MM/yyyy') : '-'}</span>
              </div>
              
              ${originalTask.priority ? `
              <div class="gantt-popup-row">
                <span class="gantt-popup-label">Prioridade:</span>
                <span class="gantt-popup-value">
                  <span class="gantt-popup-priority" style="background: ${priorityColor}"></span>
                  ${originalTask.priority.name}
                </span>
              </div>
              ` : ''}
              
              ${originalTask.responsible ? `
              <div class="gantt-popup-row">
                <span class="gantt-popup-label">Responsável:</span>
                <span class="gantt-popup-value">${originalTask.responsible.name}</span>
              </div>
              ` : ''}
              
              ${originalTask.project ? `
              <div class="gantt-popup-row">
                <span class="gantt-popup-label">Projeto:</span>
                <span class="gantt-popup-value">${originalTask.project.name}</span>
              </div>
              ` : ''}
            </div>

            ${task.progress > 0 ? `
            <div class="gantt-popup-progress">
              <div class="gantt-popup-progress-label">
                <span>Progresso</span>
                <span>${task.progress}%</span>
              </div>
              <div class="gantt-popup-progress-bar">
                <div class="gantt-popup-progress-fill" style="width: ${task.progress}%; background: ${statusColor}"></div>
              </div>
            </div>
            ` : ''}

            ${originalTask.is_blocked ? `
            <div class="gantt-popup-warning gantt-popup-blocked">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>${originalTask.block_reason || 'Tarefa bloqueada'}</span>
            </div>
            ` : ''}

            ${isOverdue ? `
            <div class="gantt-popup-warning gantt-popup-overdue">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Tarefa vencida</span>
            </div>
            ` : ''}
          </div>
          <div class="gantt-popup-footer">
            <button class="gantt-popup-btn" onclick="window.dispatchEvent(new CustomEvent('gantt-task-click', { detail: '${originalTask.uuid}' }))">
              Ver detalhes
            </button>
            <button class="gantt-popup-btn gantt-popup-btn-primary" onclick="window.dispatchEvent(new CustomEvent('gantt-task-edit', { detail: '${originalTask.uuid}' }))">
              Editar
            </button>
          </div>
        </div>
      `
    },
    on_click: (task: any) => {
      // Handled by popup
    },
    on_date_change: (task: any, start: Date, end: Date) => {
      // TODO: Implement date change handling
      console.log('Date changed:', task.id, start, end)
    },
    on_progress_change: (task: any, progress: number) => {
      // TODO: Implement progress change handling
      console.log('Progress changed:', task.id, progress)
    },
    on_view_change: (mode: ViewMode) => {
      viewMode.value = mode
    }
  })
  console.log('Gantt instance created successfully')
  } catch (error) {
    console.error('Error creating Gantt instance:', error)
  }

  // Inject custom styles for status colors
  injectStatusStyles()
}

// Inject dynamic CSS for status colors
function injectStatusStyles() {
  const styleId = 'gantt-status-styles'
  let styleEl = document.getElementById(styleId)
  
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }

  const styles = props.statuses.map(status => `
    .gantt-status-${status.id} .bar {
      fill: ${status.color} !important;
    }
    .gantt-status-${status.id} .bar-progress {
      fill: ${adjustColor(status.color, -20)} !important;
    }
  `).join('\n')

  styleEl.textContent = styles
}

// Adjust color brightness
function adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + amount))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount))
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount))
  return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`
}

// Change view mode
function changeViewMode(mode: ViewMode) {
  viewMode.value = mode
  if (ganttInstance.value) {
    ganttInstance.value.change_view_mode(mode)
  }
}

// Scroll to today
function scrollToToday() {
  if (ganttInstance.value) {
    ganttInstance.value.scroll_today()
  }
}

// Event listeners for popup buttons
function handleTaskClick(event: CustomEvent) {
  const task = findTaskByUuid(event.detail)
  if (task) {
    emit('taskClick', task)
  }
}

function handleTaskEdit(event: CustomEvent) {
  const task = findTaskByUuid(event.detail)
  if (task) {
    emit('taskEdit', task)
  }
}

// Lifecycle
onMounted(() => {
  window.addEventListener('gantt-task-click', handleTaskClick as EventListener)
  window.addEventListener('gantt-task-edit', handleTaskEdit as EventListener)
  
  console.log('GanttView mounted, tasks:', props.tasks.length)
  
  // Wait for next tick and try to init
  nextTick(() => {
    setTimeout(() => {
      if (flatTasks.value.length > 0) {
        initGantt()
      }
    }, 100)
  })
})

onUnmounted(() => {
  window.removeEventListener('gantt-task-click', handleTaskClick as EventListener)
  window.removeEventListener('gantt-task-edit', handleTaskEdit as EventListener)
})

// Watch for task changes
watch(() => props.tasks, (newTasks) => {
  console.log('Tasks changed:', newTasks.length)
  nextTick(() => {
    setTimeout(() => {
      initGantt()
    }, 100)
  })
}, { deep: true, immediate: true })

watch(viewMode, (newMode) => {
  if (ganttInstance.value) {
    ganttInstance.value.change_view_mode(newMode)
  }
})
</script>

<template>
  <div class="gantt-wrapper h-full flex flex-col overflow-hidden bg-white dark:bg-gray-900">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex items-center gap-4">
        <!-- View Mode Selector -->
        <div class="flex items-center gap-1">
          <span class="text-sm text-gray-500 mr-2">Escala:</span>
          <UButtonGroup>
            <UButton
              v-for="option in viewModeOptions"
              :key="option.value"
              size="xs"
              :variant="viewMode === option.value ? 'solid' : 'ghost'"
              @click="changeViewMode(option.value as ViewMode)"
            >
              {{ option.label }}
            </UButton>
          </UButtonGroup>
        </div>

        <USeparator orientation="vertical" class="h-6" />

        <!-- Navigation -->
        <UButton
          size="xs"
          variant="soft"
          icon="i-lucide-calendar-check"
          @click="scrollToToday"
        >
          Hoje
        </UButton>

        <!-- Refresh -->
        <UButton
          size="xs"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="loading"
          @click="emit('refresh')"
        />
      </div>

      <div class="flex items-center gap-3">
        <div class="text-sm text-gray-500">
          {{ flatTasks.length }} tarefa{{ flatTasks.length !== 1 ? 's' : '' }}
        </div>
        
        <UButton
          size="sm"
          icon="i-lucide-plus"
          color="primary"
          @click="emit('addTask')"
        >
          Nova Tarefa
        </UButton>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="w-10 h-10 animate-spin text-primary-500 mb-3" />
        <p class="text-sm text-gray-500">Carregando tarefas...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="flatTasks.length === 0" class="flex items-center justify-center flex-1">
      <div class="text-center">
        <div class="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <UIcon name="i-lucide-gantt-chart" class="w-10 h-10 text-gray-400" />
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nenhuma tarefa encontrada</h3>
        <p class="text-sm text-gray-500 mb-4">Crie sua primeira tarefa para visualizar no Gantt</p>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="emit('addTask')"
        >
          Criar Tarefa
        </UButton>
      </div>
    </div>

    <!-- Gantt Chart -->
    <div v-if="!loading && flatTasks.length > 0" class="flex-1 overflow-auto gantt-container">
      <ClientOnly>
        <div ref="ganttContainer" class="gantt-target min-h-[400px]" />
        
        <template #fallback>
          <div class="flex items-center justify-center h-full min-h-[400px]">
            <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- Legend Footer -->
    <div class="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <div class="flex items-center gap-4 text-xs text-gray-500 overflow-x-auto">
        <span class="font-medium flex-shrink-0">Status:</span>
        <div v-for="status in statuses" :key="status.id" class="flex items-center gap-1.5 flex-shrink-0">
          <span class="w-3 h-3 rounded" :style="{ backgroundColor: status.color }" />
          <span>{{ status.name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0 ml-4">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-yellow-500" />
          <span>Bloqueada</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 rounded bg-red-500" />
          <span>Vencida</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Import Frappe Gantt base styles from local file */
@import '~/assets/css/frappe-gantt.css';

/* Gantt container */
.gantt-container {
  background: #fff;
}

.dark .gantt-container {
  background: rgb(17 24 39);
}

.gantt-target {
  min-height: 100%;
}

/* Override Frappe Gantt styles */
.gantt .grid-background {
  fill: #fff;
}

.dark .gantt .grid-background {
  fill: rgb(17 24 39);
}

.gantt .grid-header {
  fill: rgb(249 250 251);
  stroke: rgb(229 231 235);
}

.dark .gantt .grid-header {
  fill: rgb(31 41 55);
  stroke: rgb(55 65 81);
}

.gantt .grid-row {
  fill: #fff;
}

.gantt .grid-row:nth-child(even) {
  fill: rgb(249 250 251);
}

.dark .gantt .grid-row {
  fill: rgb(17 24 39);
}

.dark .gantt .grid-row:nth-child(even) {
  fill: rgb(31 41 55);
}

.gantt .row-line {
  stroke: rgb(229 231 235);
}

.dark .gantt .row-line {
  stroke: rgb(55 65 81);
}

.gantt .tick {
  stroke: rgb(229 231 235);
  stroke-width: 0.5;
}

.dark .gantt .tick {
  stroke: rgb(55 65 81);
}

.gantt .today-highlight {
  fill: rgba(239, 68, 68, 0.1);
}

.gantt .bar {
  fill: #6366f1;
  stroke: none;
  rx: 4;
  ry: 4;
  transition: all 0.2s ease;
}

.gantt .bar:hover {
  filter: brightness(1.1);
}

.gantt .bar-progress {
  fill: rgba(0, 0, 0, 0.15);
  rx: 4;
  ry: 4;
}

.gantt .bar-label {
  fill: #fff;
  font-size: 12px;
  font-weight: 500;
  dominant-baseline: middle;
}

.gantt .bar-wrapper:hover .bar {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.gantt .handle {
  fill: rgba(255, 255, 255, 0.3);
  cursor: ew-resize;
}

.gantt .lower-text, .gantt .upper-text {
  fill: rgb(107 114 128);
  font-size: 12px;
}

.dark .gantt .lower-text, .dark .gantt .upper-text {
  fill: rgb(156 163 175);
}

/* Blocked task style */
.gantt-task-blocked .bar {
  stroke: #f59e0b !important;
  stroke-width: 2px !important;
  stroke-dasharray: 4 2 !important;
}

/* Overdue task style */
.gantt-task-overdue .bar {
  stroke: #ef4444 !important;
  stroke-width: 2px !important;
}

/* Completed task style */
.gantt-task-completed .bar {
  opacity: 0.6;
}

/* Default task style */
.gantt-task-default .bar {
  fill: #6366f1 !important;
}

/* Arrow/dependency styles */
.gantt .arrow {
  stroke: rgb(156 163 175);
  stroke-width: 1.5;
  fill: none;
}

.dark .gantt .arrow {
  stroke: rgb(107 114 128);
}

/* Custom popup styles */
.gantt-popup {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border: 1px solid rgb(229 231 235);
  overflow: hidden;
  min-width: 300px;
  max-width: 400px;
}

.dark .gantt-popup {
  background: rgb(31 41 55);
  border-color: rgb(55 65 81);
}

.gantt-popup-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
}

.gantt-popup-code {
  font-family: monospace;
  font-size: 12px;
  opacity: 0.9;
}

.gantt-popup-status {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
}

.gantt-popup-body {
  padding: 16px;
}

.gantt-popup-title {
  font-size: 15px;
  font-weight: 600;
  color: rgb(17 24 39);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.dark .gantt-popup-title {
  color: rgb(243 244 246);
}

.gantt-popup-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gantt-popup-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.gantt-popup-label {
  color: rgb(107 114 128);
}

.dark .gantt-popup-label {
  color: rgb(156 163 175);
}

.gantt-popup-value {
  color: rgb(55 65 81);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dark .gantt-popup-value {
  color: rgb(209 213 219);
}

.gantt-popup-priority {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.gantt-popup-progress {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgb(229 231 235);
}

.dark .gantt-popup-progress {
  border-color: rgb(55 65 81);
}

.gantt-popup-progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: rgb(107 114 128);
  margin-bottom: 6px;
}

.dark .gantt-popup-progress-label {
  color: rgb(156 163 175);
}

.gantt-popup-progress-bar {
  height: 6px;
  background: rgb(229 231 235);
  border-radius: 3px;
  overflow: hidden;
}

.dark .gantt-popup-progress-bar {
  background: rgb(55 65 81);
}

.gantt-popup-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.gantt-popup-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 12px;
}

.gantt-popup-blocked {
  background: rgb(254 243 199);
  color: rgb(180 83 9);
}

.dark .gantt-popup-blocked {
  background: rgba(245, 158, 11, 0.2);
  color: rgb(251 191 36);
}

.gantt-popup-overdue {
  background: rgb(254 226 226);
  color: rgb(185 28 28);
}

.dark .gantt-popup-overdue {
  background: rgba(239, 68, 68, 0.2);
  color: rgb(248 113 113);
}

.gantt-popup-footer {
  padding: 12px 16px;
  background: rgb(249 250 251);
  border-top: 1px solid rgb(229 231 235);
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.dark .gantt-popup-footer {
  background: rgb(17 24 39);
  border-color: rgb(55 65 81);
}

.gantt-popup-btn {
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid rgb(209 213 219);
  background: #fff;
  color: rgb(55 65 81);
}

.gantt-popup-btn:hover {
  background: rgb(249 250 251);
  border-color: rgb(156 163 175);
}

.dark .gantt-popup-btn {
  background: rgb(55 65 81);
  border-color: rgb(75 85 99);
  color: rgb(209 213 219);
}

.dark .gantt-popup-btn:hover {
  background: rgb(75 85 99);
}

.gantt-popup-btn-primary {
  background: rgb(99 102 241);
  border-color: rgb(99 102 241);
  color: #fff;
}

.gantt-popup-btn-primary:hover {
  background: rgb(79 70 229);
  border-color: rgb(79 70 229);
}

.dark .gantt-popup-btn-primary {
  background: rgb(99 102 241);
  border-color: rgb(99 102 241);
}

.dark .gantt-popup-btn-primary:hover {
  background: rgb(79 70 229);
}

/* Scrollbar styles */
.gantt-container::-webkit-scrollbar {
  height: 10px;
  width: 10px;
}

.gantt-container::-webkit-scrollbar-track {
  background: rgb(243 244 246);
}

.dark .gantt-container::-webkit-scrollbar-track {
  background: rgb(31 41 55);
}

.gantt-container::-webkit-scrollbar-thumb {
  background: rgb(209 213 219);
  border-radius: 5px;
}

.gantt-container::-webkit-scrollbar-thumb:hover {
  background: rgb(156 163 175);
}

.dark .gantt-container::-webkit-scrollbar-thumb {
  background: rgb(75 85 99);
}

.dark .gantt-container::-webkit-scrollbar-thumb:hover {
  background: rgb(107 114 128);
}

/* Hide default popup wrapper */
.popup-wrapper {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
</style>
