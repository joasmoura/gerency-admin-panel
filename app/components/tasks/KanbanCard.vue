<script setup lang="ts">
import type { Task, TaskBlocker } from '~/types'

const props = defineProps<{
  task: Task
  dragging?: boolean
}>()

const emit = defineEmits<{
  click: []
  edit: []
  openTask: [taskUuid: string]
}>()

// Computed properties
const isOverdue = computed(() => {
  if (!props.task.due_date || props.task.completed_at) return false
  return new Date(props.task.due_date) < new Date()
})

const formattedDueDate = computed(() => {
  if (!props.task.due_date) return null
  const date = new Date(props.task.due_date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  if (date.toDateString() === today.toDateString()) {
    return 'Hoje'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Amanhã'
  } else {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  }
})

const priorityColor = computed(() => {
  return props.task.priority?.color || '#94a3b8'
})

const typeIcon = computed(() => {
  const icons: Record<string, string> = {
    'Feature': 'i-lucide-sparkles',
    'Bug': 'i-lucide-bug',
    'Melhoria': 'i-lucide-trending-up',
    'Tarefa': 'i-lucide-check-square'
  }
  return props.task.type?.icon || icons[props.task.type?.name || ''] || 'i-lucide-circle'
})

// Blockers computeds
const hasBlockers = computed(() => props.task.blockers && props.task.blockers.length > 0)
const hasBlocking = computed(() => props.task.blocking && props.task.blocking.length > 0)
const blockersCount = computed(() => props.task.blockers?.length || 0)
const blockingCount = computed(() => props.task.blocking?.length || 0)
const completedBlockersCount = computed(() => 
  props.task.blockers?.filter(b => b.status?.is_completed).length || 0
)

// Checklist progress computeds
const hasChecklists = computed(() => props.task.checklists && props.task.checklists.length > 0)
const checklistsTotal = computed(() => props.task.checklists?.length || 0)
const checklistsCompleted = computed(() => 
  props.task.checklists?.filter(c => c.is_completed).length || 0
)
const checklistProgress = computed(() => {
  if (!checklistsTotal.value) return 0
  return Math.round((checklistsCompleted.value / checklistsTotal.value) * 100)
})

// Prevent click when dragging
function handleClick(event: MouseEvent) {
  if (!props.dragging) {
    emit('click')
  }
}

function handleEdit(event: MouseEvent) {
  event.stopPropagation()
  emit('edit')
}

function handleOpenBlockerTask(taskUuid: string, event: MouseEvent) {
  event.stopPropagation()
  emit('openTask', taskUuid)
}
</script>

<template>
  <div
    class="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 cursor-pointer hover:shadow-md transition-all duration-200"
    :class="{
      'opacity-50 scale-95': dragging,
      'border-l-4': task.is_blocked,
      'border-l-yellow-500': task.is_blocked
    }"
    @click="handleClick"
  >
    <!-- Header: Code, Type, Priority -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-400 font-mono">#{{ task.code }}</span>
        
        <!-- Type Badge -->
        <UBadge
          v-if="task.type"
          :label="task.type.name"
          size="xs"
          :style="{ backgroundColor: task.type.color + '20', color: task.type.color }"
          class="font-normal"
        >
          <template #leading>
            <UIcon :name="typeIcon" class="w-3 h-3" />
          </template>
        </UBadge>

        <!-- Priority Badge -->
        <UBadge
          v-if="task.priority"
          :label="task.priority.name"
          size="xs"
          :style="{ backgroundColor: priorityColor + '20', color: priorityColor }"
          class="font-normal"
        />
      </div>

      <!-- Actions (visible on hover) -->
      <UButton
        icon="i-lucide-more-horizontal"
        size="xs"
        variant="ghost"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        @click="handleEdit"
      />
    </div>

    <!-- Project Badge -->
    <div v-if="task.project" class="mb-2">
      <UBadge
        :label="task.project.name"
        size="xs"
        variant="subtle"
        color="primary"
        class="font-normal"
      />
    </div>

    <!-- Title -->
    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
      {{ task.title }}
    </h4>

    <!-- Checklist Progress -->
    <div v-if="hasChecklists" class="mb-2">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-list-checks" class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <UProgress 
          v-model="checklistProgress" 
          size="xs"
          :color="checklistProgress === 100 ? 'success' : 'primary'"
          class="flex-1"
        />
        <span 
          class="text-xs font-medium whitespace-nowrap"
          :class="checklistProgress === 100 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'"
        >
          {{ checklistProgress }}% ({{ checklistsCompleted }}/{{ checklistsTotal }})
        </span>
      </div>
    </div>

    <!-- Blockers/Blocking Indicators -->
    <div v-if="hasBlockers || hasBlocking || task.is_blocked" class="flex items-center gap-2 flex-wrap mb-2">
      <!-- Esta tarefa está sendo bloqueada (com tarefas vinculadas) -->
      <UPopover v-if="hasBlockers" :popper="{ placement: 'bottom-start' }">
        <button 
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors cursor-pointer"
          @click.stop
        >
          <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" />
          <span>{{ completedBlockersCount }}/{{ blockersCount }}</span>
        </button>
        <template #content>
          <div class="p-3 space-y-2 min-w-[250px] max-w-sm">
            <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
              <UIcon name="i-lucide-alert-triangle" class="w-3 h-3 inline text-yellow-500 mr-1" />
              Bloqueada por {{ blockersCount }} tarefa(s)
            </p>
            <div 
              v-for="blocker in task.blockers" 
              :key="blocker.uuid"
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              @click="handleOpenBlockerTask(blocker.uuid, $event)"
            >
              <UIcon 
                :name="blocker.status?.is_completed ? 'i-lucide-check-circle' : 'i-lucide-circle'" 
                :class="blocker.status?.is_completed ? 'w-4 h-4 text-green-500 flex-shrink-0' : 'w-4 h-4 text-orange-500 flex-shrink-0'"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">
                  <span class="text-xs font-mono text-gray-400">#{{ blocker.code }}</span>
                  <span 
                    v-if="blocker.status"
                    class="text-[10px] px-1 py-0.5 rounded"
                    :style="{ backgroundColor: blocker.status.color + '20', color: blocker.status.color }"
                  >
                    {{ blocker.status.name }}
                  </span>
                </div>
                <p class="text-sm truncate text-gray-900 dark:text-gray-100">{{ blocker.title }}</p>
              </div>
              <UIcon name="i-lucide-external-link" class="w-3 h-3 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </template>
      </UPopover>

      <!-- Blocked sem tasks vinculadas -->
      <UPopover v-else-if="task.is_blocked && !hasBlockers" :popper="{ placement: 'bottom-start' }">
        <button 
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors cursor-pointer"
          @click.stop
        >
          <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" />
          <span>Impedida</span>
        </button>
        <template #content>
          <div class="p-3 min-w-[180px]">
            <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <UIcon name="i-lucide-alert-triangle" class="w-3 h-3 inline text-yellow-500 mr-1" />
              Tarefa Impedida
            </p>
            <p v-if="task.block_reason" class="text-sm text-gray-600 dark:text-gray-400">
              {{ task.block_reason }}
            </p>
            <p v-else class="text-sm text-gray-500 italic">
              Sem descrição do impedimento
            </p>
          </div>
        </template>
      </UPopover>

      <!-- Esta tarefa está bloqueando outras -->
      <UPopover v-if="hasBlocking" :popper="{ placement: 'bottom-start' }">
        <button 
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer"
          @click.stop
        >
          <UIcon name="i-lucide-lock" class="w-3 h-3" />
          <span>{{ blockingCount }}</span>
        </button>
        <template #content>
          <div class="p-3 space-y-2 min-w-[250px] max-w-xs">
            <p class="text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2">
              <UIcon name="i-lucide-lock" class="w-3 h-3 inline text-red-500 mr-1" />
              Bloqueando {{ blockingCount }} tarefa(s)
            </p>
            <div 
              v-for="blocked in task.blocking" 
              :key="blocked.uuid"
              class="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              @click="handleOpenBlockerTask(blocked.uuid, $event)"
            >
              <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-yellow-500 flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1">
                  <span class="text-xs font-mono text-gray-400">#{{ blocked.code }}</span>
                  <span 
                    v-if="blocked.status"
                    class="text-[10px] px-1 py-0.5 rounded"
                    :style="{ backgroundColor: blocked.status.color + '20', color: blocked.status.color }"
                  >
                    {{ blocked.status.name }}
                  </span>
                </div>
                <p class="text-sm truncate text-gray-900 dark:text-gray-100">{{ blocked.title }}</p>
              </div>
              <UIcon name="i-lucide-external-link" class="w-3 h-3 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </template>
      </UPopover>
    </div>

    <!-- Footer: Due date, Responsible -->
    <div class="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
      <div class="flex items-center gap-2">
        <!-- Due Date -->
        <div
          v-if="formattedDueDate"
          class="flex items-center gap-1 text-xs"
          :class="isOverdue ? 'text-red-500' : 'text-gray-500'"
        >
          <UIcon name="i-lucide-calendar" class="w-3 h-3" />
          <span>{{ formattedDueDate }}</span>
        </div>

        <!-- Estimated Time -->
        <div
          v-if="task.estimated_hours || task.estimated_minutes"
          class="flex items-center gap-1 text-xs text-gray-500"
        >
          <UIcon name="i-lucide-clock" class="w-3 h-3" />
          <span>
            {{ task.estimated_hours }}h{{ task.estimated_minutes ? `${task.estimated_minutes}m` : '' }}
          </span>
        </div>
      </div>

      <!-- Responsible -->
       <UTooltip
        v-if="task.responsible"
        :text="task.responsible.name"
        :placement="'top'"
        :delay-duration="0"
        >
          <UAvatar
            :alt="task.responsible.name"
            size="xs"
            :ui="{ root: 'ring-2 ring-white dark:ring-gray-800' }"
          />
        </UTooltip>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
