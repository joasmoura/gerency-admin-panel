<script setup lang="ts">
import type { TaskActivity, TaskActivityAction } from '~/types'

const props = defineProps<{
  taskUuid: string
}>()

const {
  activities,
  loading,
  pagination,
  hasMore,
  fetchActivities,
  loadMoreActivities,
  getActionLabel,
  getActionIcon,
  getActionColor,
  formatRelativeTime,
  activitiesByDate
} = useTaskActivities()

// Filter state
const selectedAction = ref<TaskActivityAction | ''>('')
const dateFrom = ref('')
const dateTo = ref('')

// Action filter options
const actionOptions = [
  { label: 'Todas as ações', value: null },
  { label: 'Criação', value: 'created' },
  { label: 'Atualização', value: 'updated' },
  { label: 'Mudança de status', value: 'status_changed' },
  { label: 'Conclusão', value: 'completed' },
  { label: 'Comentários', value: 'commented' },
  { label: 'Menções', value: 'mentioned' },
  { label: 'Checklist', value: 'checklist_completed' },
  { label: 'Impedimentos', value: 'blocker_added' },
  { label: 'Atribuição', value: 'assigned' }
]

// Load activities on mount
onMounted(async () => {
  await fetchActivities(props.taskUuid, { per_page: 30 })
})

// Watch for filter changes
watch([selectedAction, dateFrom, dateTo], async () => {
  await fetchActivities(props.taskUuid, {
    per_page: 30,
    action: selectedAction.value || undefined,
    date_from: dateFrom.value || undefined,
    date_to: dateTo.value || undefined
  })
})

// Reload when task changes
watch(() => props.taskUuid, async (newUuid) => {
  if (newUuid) {
    await fetchActivities(newUuid, { per_page: 30 })
  }
})

// Load more handler
const handleLoadMore = async () => {
  await loadMoreActivities(props.taskUuid)
}

// Get background color for activity dot
const getDotColor = (action: TaskActivityAction) => {
  const color = getActionColor(action)
  const colorMap: Record<string, string> = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-400'
  }
  return colorMap[color] || 'bg-gray-400'
}

// Get text color for activity
const getTextColor = (action: TaskActivityAction) => {
  const color = getActionColor(action)
  const colorMap: Record<string, string> = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    purple: 'text-purple-600 dark:text-purple-400',
    gray: 'text-gray-600 dark:text-gray-400'
  }
  return colorMap[color] || 'text-gray-600 dark:text-gray-400'
}

// Clear filters
const clearFilters = () => {
  selectedAction.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const hasFilters = computed(() => selectedAction.value || dateFrom.value || dateTo.value)
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header with Filters -->
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Action Filter -->
        <USelect
          v-model="selectedAction"
          :items="actionOptions"
          placeholder="Filtrar por ação"
          size="sm"
          class="w-48"
        />
        
        <!-- Date Range -->
        <div class="flex items-center gap-2">
          <UInput
            v-model="dateFrom"
            type="date"
            size="sm"
            placeholder="De"
            class="w-36"
          />
          <span class="text-gray-400">-</span>
          <UInput
            v-model="dateTo"
            type="date"
            size="sm"
            placeholder="Até"
            class="w-36"
          />
        </div>
        
        <!-- Clear Filters -->
        <UButton
          v-if="hasFilters"
          icon="i-heroicons-x-mark"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="clearFilters"
        >
          Limpar
        </UButton>
        
        <!-- Activity Count -->
        <span class="ml-auto text-sm text-gray-500">
          {{ pagination.total }} atividades
        </span>
      </div>
    </div>

    <!-- Timeline Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <!-- Loading State -->
      <div v-if="loading && activities.length === 0" class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400 animate-spin mb-3" />
        <p class="text-gray-500">Carregando histórico...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="activities.length === 0" class="flex flex-col items-center justify-center py-12">
        <UIcon name="i-heroicons-clock" class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <p class="text-gray-500 dark:text-gray-400 text-center">
          {{ hasFilters ? 'Nenhuma atividade encontrada com os filtros aplicados' : 'Nenhuma atividade registrada ainda' }}
        </p>
      </div>

      <!-- Timeline -->
      <div v-else class="relative">
        <!-- Timeline Line -->
        <div class="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <!-- Activities grouped by date -->
        <div v-for="(dayActivities, date) in activitiesByDate" :key="date" class="mb-6">
          <!-- Date Header -->
          <div class="sticky top-0 bg-white dark:bg-gray-800 z-10 py-2 mb-3">
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {{ date }}
            </span>
          </div>

          <!-- Activity Items -->
          <div class="space-y-4">
            <div
              v-for="activity in dayActivities"
              :key="activity.uuid"
              class="relative flex items-start gap-4 ml-0"
            >
              <!-- Activity Dot -->
              <div class="relative z-10 flex-shrink-0">
                <div :class="[
                  'w-8 h-8 rounded-full flex items-center justify-center',
                  getDotColor(activity.action)
                ]">
                  <UIcon
                    :name="getActionIcon(activity.action)"
                    class="w-4 h-4 text-white"
                  />
                </div>
              </div>

              <!-- Activity Content -->
              <div class="flex-1 min-w-0 pb-4">
                <div class="flex items-start justify-between gap-2">
                  <!-- Main Content -->
                  <div class="flex-1 min-w-0">
                    <!-- User and Action -->
                    <p class="text-sm">
                      <span v-if="activity.user" class="font-medium text-gray-900 dark:text-white">
                        {{ activity.user.name }}
                      </span>
                      <span v-else class="text-gray-500">Sistema</span>
                      <span class="text-gray-600 dark:text-gray-400"> {{ activity.description || getActionLabel(activity.action) }}</span>
                    </p>

                    <!-- Field Change Details -->
                    <div v-if="activity.old_value || activity.new_value" class="flex flex-col sm:flex-row sm:items-center mt-1 text-xs text-gray-500">
                      <span v-if="activity.old_value" class="inline-flex items-center gap-1">
                        <span class="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded line-through" v-html="activity.old_value">
                        </span>
                      </span>
                      <span v-if="activity.old_value && activity.new_value" class="mx-1">→</span>
                      <span v-if="activity.new_value" class="inline-flex items-center gap-1">
                        <span class="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded" v-html="activity.new_value">
                        </span>
                      </span>
                    </div>

                    <!-- Metadata info (for mentions, blockers, etc) -->
                    <div v-if="activity.metadata && activity.action === 'mentioned'" class="mt-1">
                      <span class="inline-flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                        <UIcon name="i-heroicons-at-symbol" class="w-3 h-3" />
                        {{ activity.metadata.mentioned_user_name }}
                      </span>
                    </div>

                    <div v-if="activity.metadata && (activity.action === 'blocker_added' || activity.action === 'blocker_removed')" class="mt-1">
                      <span class="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                        <UIcon name="i-heroicons-link" class="w-3 h-3" />
                        {{ activity.metadata.blocking_task_code }} - {{ activity.metadata.blocking_task_title }}
                      </span>
                    </div>

                    <div v-if="activity.metadata && activity.action.includes('checklist')" class="mt-1">
                      <span class="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <UIcon name="i-heroicons-check-circle" class="w-3 h-3" />
                        {{ activity.metadata.checklist_title }}
                      </span>
                    </div>
                  </div>

                  <!-- Timestamp -->
                  <div class="flex-shrink-0">
                    <time
                      :datetime="activity.created_at"
                      class="text-xs text-gray-400"
                      :title="new Date(activity.created_at).toLocaleString('pt-BR')"
                    >
                      {{ formatRelativeTime(activity.created_at) }}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Load More Button -->
        <div v-if="hasMore" class="flex justify-center pt-4 pb-2">
          <UButton
            :loading="loading"
            variant="soft"
            color="neutral"
            size="sm"
            @click="handleLoadMore"
          >
            <UIcon name="i-heroicons-arrow-down" class="w-4 h-4 mr-1" />
            Carregar mais
          </UButton>
        </div>

        <!-- Loading More Indicator -->
        <div v-if="loading && activities.length > 0" class="flex justify-center py-4">
          <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      </div>
    </div>
  </div>
</template>
