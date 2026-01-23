<script setup lang="ts">
import type { LogFile, LogEntry, LogStats, LogFilters } from '~/composables/useAdminApi'

const toast = useToast()
const { 
  fetchLogFiles, 
  fetchLogEntries, 
  fetchLogStats, 
  clearLogFile, 
  deleteLogFile,
  downloadLogFile,
  loading 
} = useAdminApi()

// State
const files = ref<LogFile[]>([])
const entries = ref<LogEntry[]>([])
const stats = ref<LogStats | null>(null)
const selectedFile = ref('laravel.log')
const selectedEntry = ref<LogEntry | null>(null)
const showDetailModal = ref(false)
const showClearConfirmModal = ref(false)
const showDeleteConfirmModal = ref(false)
const isRefreshing = ref(false)
const autoRefresh = ref(false)
const autoRefreshInterval = ref<ReturnType<typeof setInterval> | null>(null)

// Pagination
const meta = ref({ current_page: 1, last_page: 1, per_page: 50, total: 0 })

// Filters
const filters = reactive<LogFilters>({
  level: undefined,
  search: '',
  per_page: 50,
})

type BadgeColor = 'error' | 'warning' | 'info' | 'neutral' | 'primary' | 'secondary' | 'success'

const levelOptions: { label: string; value: string | undefined; color?: BadgeColor }[] = [
  { label: 'Todos os níveis', value: undefined },
  { label: 'Emergency', value: 'emergency', color: 'error' },
  { label: 'Alert', value: 'alert', color: 'error' },
  { label: 'Critical', value: 'critical', color: 'error' },
  { label: 'Error', value: 'error', color: 'error' },
  { label: 'Warning', value: 'warning', color: 'warning' },
  { label: 'Notice', value: 'notice', color: 'info' },
  { label: 'Info', value: 'info', color: 'info' },
  { label: 'Debug', value: 'debug', color: 'neutral' },
]

const perPageOptions = [
  { label: '25 por página', value: 25 },
  { label: '50 por página', value: 50 },
  { label: '100 por página', value: 100 },
  { label: '200 por página', value: 200 },
]

// Computed
const errorCount = computed(() => {
  if (!stats.value) return 0
  const levels = stats.value.by_level
  return (levels.error || 0) + (levels.critical || 0) + (levels.alert || 0) + (levels.emergency || 0)
})

const warningCount = computed(() => stats.value?.by_level?.warning || 0)

// Lifecycle
onMounted(async () => {
  await loadFiles()
  if (files.value.length > 0) {
    await loadEntries()
    await loadStats()
  }
})

onUnmounted(() => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
  }
})

// Watch for auto-refresh toggle
watch(autoRefresh, (newVal) => {
  if (newVal) {
    autoRefreshInterval.value = setInterval(() => {
      loadEntries(meta.value.current_page)
    }, 10000) // Refresh every 10 seconds
  } else if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
})

// Methods
const loadFiles = async () => {
  try {
    const response = await fetchLogFiles()
    files.value = response
    if (response.length > 0 && !response.find(f => f.name === selectedFile.value)) {
      selectedFile.value = response[0]?.name || 'laravel.log'
    }
  } catch (err) {
    console.error('Error loading log files:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar arquivos de log',
      color: 'error',
    })
  }
}

const loadEntries = async (page = 1) => {
  try {
    const response = await fetchLogEntries({
      file: selectedFile.value,
      level: filters.level,
      search: filters.search || undefined,
      per_page: filters.per_page,
      page,
    })
    entries.value = response.data
    meta.value = response.meta
    if (response.stats) {
      stats.value = response.stats
    }
  } catch (err: any) {
    console.error('Error loading log entries:', err)
    if (err?.statusCode !== 404) {
      toast.add({
        title: 'Erro',
        description: 'Erro ao carregar entradas de log',
        color: 'error',
      })
    }
  }
}

const loadStats = async () => {
  try {
    const response = await fetchLogStats(selectedFile.value)
    stats.value = response.stats
  } catch (err) {
    console.error('Error loading log stats:', err)
  }
}

const handleFileChange = async () => {
  meta.value.current_page = 1
  await Promise.all([loadEntries(), loadStats()])
}

const handleSearch = () => {
  loadEntries(1)
}

const handleRefresh = async () => {
  isRefreshing.value = true
  await Promise.all([loadFiles(), loadEntries(meta.value.current_page), loadStats()])
  isRefreshing.value = false
}

const handleClearFile = async () => {
  try {
    await clearLogFile(selectedFile.value)
    toast.add({
      title: 'Sucesso',
      description: 'Arquivo de log limpo com sucesso',
      color: 'success',
    })
    showClearConfirmModal.value = false
    await Promise.all([loadEntries(), loadStats()])
  } catch (err) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao limpar arquivo de log',
      color: 'error',
    })
  }
}

const handleDeleteFile = async () => {
  try {
    await deleteLogFile(selectedFile.value)
    toast.add({
      title: 'Sucesso',
      description: 'Arquivo de log excluído com sucesso',
      color: 'success',
    })
    showDeleteConfirmModal.value = false
    await loadFiles()
    if (files.value.length > 0) {
      selectedFile.value = files.value[0]?.name || 'laravel.log'
      await handleFileChange()
    }
  } catch (err) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao excluir arquivo de log',
      color: 'error',
    })
  }
}

const handleDownload = async () => {
  try {
    await downloadLogFile(selectedFile.value)
  } catch (err) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao baixar arquivo de log',
      color: 'error',
    })
  }
}

const openEntryDetail = (entry: LogEntry) => {
  selectedEntry.value = entry
  showDetailModal.value = true
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const formatDateShort = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const today = new Date()
  const isToday = date.toDateString() === today.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getLevelColor = (level: string): 'error' | 'warning' | 'info' | 'neutral' | 'primary' | 'secondary' | 'success' => {
  const colors: Record<string, 'error' | 'warning' | 'info' | 'neutral' | 'primary' | 'secondary' | 'success'> = {
    emergency: 'error',
    alert: 'error',
    critical: 'error',
    error: 'error',
    warning: 'warning',
    notice: 'info',
    info: 'info',
    debug: 'neutral',
  }
  return colors[level.toLowerCase()] || 'neutral'
}

const getLevelIcon = (level: string) => {
  const icons: Record<string, string> = {
    emergency: 'i-lucide-alert-octagon',
    alert: 'i-lucide-alert-triangle',
    critical: 'i-lucide-x-octagon',
    error: 'i-lucide-x-circle',
    warning: 'i-lucide-alert-triangle',
    notice: 'i-lucide-info',
    info: 'i-lucide-info',
    debug: 'i-lucide-bug',
  }
  return icons[level.toLowerCase()] || 'i-lucide-file-text'
}

const truncateMessage = (message: string, maxLength = 150) => {
  if (!message) return ''
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + '...'
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.add({
      title: 'Copiado',
      description: 'Conteúdo copiado para a área de transferência',
      color: 'success',
    })
  } catch (err) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao copiar para a área de transferência',
      color: 'error',
    })
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Logs do Sistema
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Visualize e analise os logs do Laravel em tempo real
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UTooltip text="Auto-refresh a cada 10s">
          <UToggle v-model="autoRefresh" />
        </UTooltip>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-refresh-cw"
          :loading="isRefreshing"
          @click="handleRefresh"
        >
          Atualizar
        </UButton>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <UCard>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900">
            <UIcon name="i-lucide-file-text" class="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Total de Entradas</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ meta.total.toLocaleString() }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-error-100 dark:bg-error-900">
            <UIcon name="i-lucide-x-circle" class="h-5 w-5 text-error-600 dark:text-error-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Erros</p>
            <p class="text-xl font-semibold text-error-600 dark:text-error-400">
              {{ errorCount.toLocaleString() }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
            <UIcon name="i-lucide-alert-triangle" class="h-5 w-5 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Warnings</p>
            <p class="text-xl font-semibold text-warning-600 dark:text-warning-400">
              {{ warningCount.toLocaleString() }}
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-info-100 dark:bg-info-900">
            <UIcon name="i-lucide-clock" class="h-5 w-5 text-info-600 dark:text-info-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Erros Hoje</p>
            <p class="text-xl font-semibold text-gray-900 dark:text-white">
              {{ stats?.errors_today || 0 }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filters and Actions -->
    <UCard class="mb-6">
      <div class="flex flex-col lg:flex-row items-start lg:items-center gap-4">
        <!-- File Select -->
        <div class="w-full lg:w-48">
          <USelectMenu
            v-model="selectedFile"
            :options="files.map(f => ({ label: f.name, value: f.name, size: f.size }))"
            value-attribute="value"
            option-attribute="label"
            placeholder="Arquivo de log"
            @update:model-value="handleFileChange"
          />
        </div>

        <!-- Level Filter -->
        <div class="w-full lg:w-48">
          <USelectMenu
            v-model="filters.level"
            :options="levelOptions"
            value-attribute="value"
            option-attribute="label"
            placeholder="Nível"
            @update:model-value="handleSearch"
          />
        </div>

        <!-- Per Page -->
        <div class="w-full lg:w-40">
          <USelectMenu
            v-model="filters.per_page"
            :options="perPageOptions"
            value-attribute="value"
            option-attribute="label"
            @update:model-value="handleSearch"
          />
        </div>

        <!-- Search -->
        <div class="flex-1 w-full lg:w-auto">
          <UInput
            v-model="filters.search"
            placeholder="Buscar nos logs..."
            icon="i-lucide-search"
            @keyup.enter="handleSearch"
          >
            <template #trailing>
              <UButton
                v-if="filters.search"
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                size="xs"
                @click="filters.search = ''; handleSearch()"
              />
            </template>
          </UInput>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 w-full lg:w-auto">
          <UTooltip text="Baixar arquivo">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-download"
              @click="handleDownload"
            />
          </UTooltip>
          <UTooltip text="Limpar arquivo">
            <UButton
              color="warning"
              variant="ghost"
              icon="i-lucide-trash-2"
              @click="showClearConfirmModal = true"
            />
          </UTooltip>
          <UTooltip text="Excluir arquivo" v-if="selectedFile !== 'laravel.log'">
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-file-x"
              @click="showDeleteConfirmModal = true"
            />
          </UTooltip>
        </div>
      </div>
    </UCard>

    <!-- Level Stats Bar -->
    <UCard v-if="stats?.by_level" class="mb-6">
      <div class="flex flex-wrap gap-3">
        <button
          v-for="level in levelOptions.filter(l => l.value)"
          :key="level.value"
          class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
          :class="[
            filters.level === level.value
              ? `bg-${level.color}-100 dark:bg-${level.color}-900 text-${level.color}-700 dark:text-${level.color}-300 ring-2 ring-${level.color}-500`
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
          ]"
          @click="filters.level = filters.level === level.value ? undefined : level.value; handleSearch()"
        >
          <UIcon :name="getLevelIcon(level.value!)" class="h-4 w-4" />
          <span>{{ level.label }}</span>
          <UBadge
            :color="level.color"
            variant="subtle"
            size="xs"
          >
            {{ stats.by_level[level.value!] || 0 }}
          </UBadge>
        </button>
      </div>
    </UCard>

    <!-- Log Entries -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500 dark:text-gray-400">
            Mostrando {{ entries.length }} de {{ meta.total }} entradas
          </span>
          <div v-if="autoRefresh" class="flex items-center gap-2 text-sm text-gray-500">
            <UIcon name="i-lucide-refresh-cw" class="h-3 w-3 animate-spin" />
            Auto-refresh ativo
          </div>
        </div>
      </template>

      <!-- Loading -->
      <div v-if="loading && entries.length === 0" class="flex items-center justify-center py-20">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <!-- Empty State -->
      <div v-else-if="entries.length === 0" class="flex flex-col items-center justify-center py-20">
        <UIcon name="i-lucide-file-check" class="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-1">
          Nenhum log encontrado
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          {{ filters.search || filters.level ? 'Tente ajustar os filtros' : 'O arquivo de log está vazio' }}
        </p>
      </div>

      <!-- Log List -->
      <div v-else class="space-y-2">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-all"
          @click="openEntryDetail(entry)"
        >
          <!-- Level Icon -->
          <div
            class="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full"
            :class="{
              'bg-error-100 dark:bg-error-900/50': ['emergency', 'alert', 'critical', 'error'].includes(entry.level),
              'bg-warning-100 dark:bg-warning-900/50': entry.level === 'warning',
              'bg-info-100 dark:bg-info-900/50': ['notice', 'info'].includes(entry.level),
              'bg-gray-100 dark:bg-gray-800': entry.level === 'debug',
            }"
          >
            <UIcon
              :name="getLevelIcon(entry.level)"
              class="h-4 w-4"
              :class="{
                'text-error-600 dark:text-error-400': ['emergency', 'alert', 'critical', 'error'].includes(entry.level),
                'text-warning-600 dark:text-warning-400': entry.level === 'warning',
                'text-info-600 dark:text-info-400': ['notice', 'info'].includes(entry.level),
                'text-gray-600 dark:text-gray-400': entry.level === 'debug',
              }"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <UBadge :color="getLevelColor(entry.level)" variant="subtle" size="xs">
                {{ entry.level.toUpperCase() }}
              </UBadge>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{ formatDateShort(entry.datetime) }}
              </span>
              <span class="text-xs text-gray-400 dark:text-gray-500">
                {{ entry.environment }}
              </span>
              <UIcon
                v-if="entry.has_stack_trace"
                name="i-lucide-code"
                class="h-3 w-3 text-gray-400"
                title="Contém stack trace"
              />
            </div>
            <p class="text-sm text-gray-900 dark:text-white break-words font-mono">
              {{ truncateMessage(entry.message) }}
            </p>
            <p v-if="entry.context" class="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {{ truncateMessage(entry.context, 100) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              variant="ghost"
              color="neutral"
              size="xs"
              icon="i-lucide-eye"
            />
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <template #footer v-if="meta.last_page > 1">
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            Página {{ meta.current_page }} de {{ meta.last_page }}
          </div>
          <UPagination
            :default-page="meta.current_page"
            :items-per-page="meta.per_page"
            :total="meta.total"
            @update:page="loadEntries"
          />
        </div>
      </template>
    </UCard>

    <!-- Entry Detail Modal -->
    <UModal v-model:open="showDetailModal" fullscreen>
      <template #content>
        <UCard v-if="selectedEntry">
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-full"
                  :class="{
                    'bg-error-100 dark:bg-error-900/50': ['emergency', 'alert', 'critical', 'error'].includes(selectedEntry.level),
                    'bg-warning-100 dark:bg-warning-900/50': selectedEntry.level === 'warning',
                    'bg-info-100 dark:bg-info-900/50': ['notice', 'info'].includes(selectedEntry.level),
                    'bg-gray-100 dark:bg-gray-800': selectedEntry.level === 'debug',
                  }"
                >
                  <UIcon
                    :name="getLevelIcon(selectedEntry.level)"
                    class="h-5 w-5"
                    :class="{
                      'text-error-600 dark:text-error-400': ['emergency', 'alert', 'critical', 'error'].includes(selectedEntry.level),
                      'text-warning-600 dark:text-warning-400': selectedEntry.level === 'warning',
                      'text-info-600 dark:text-info-400': ['notice', 'info'].includes(selectedEntry.level),
                      'text-gray-600 dark:text-gray-400': selectedEntry.level === 'debug',
                    }"
                  />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <UBadge :color="getLevelColor(selectedEntry.level)" variant="subtle">
                      {{ selectedEntry.level.toUpperCase() }}
                    </UBadge>
                    <span class="text-sm text-gray-500 dark:text-gray-400">
                      {{ selectedEntry.environment }}
                    </span>
                  </div>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ formatDate(selectedEntry.datetime) }}
                  </p>
                </div>
              </div>
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-x"
                @click="showDetailModal = false"
              />
            </div>
          </template>

          <div class="space-y-4">
            <!-- Message -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Mensagem</h4>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-copy"
                  @click="copyToClipboard(selectedEntry.message)"
                >
                  Copiar
                </UButton>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <pre class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono break-words">{{ selectedEntry.message }}</pre>
              </div>
            </div>

            <!-- Context -->
            <div v-if="selectedEntry.context">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Contexto</h4>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-copy"
                  @click="copyToClipboard(selectedEntry.context)"
                >
                  Copiar
                </UButton>
              </div>
              <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-60 overflow-auto">
                <pre class="text-sm text-gray-900 dark:text-white whitespace-pre-wrap font-mono break-words">{{ selectedEntry.context }}</pre>
              </div>
            </div>

            <!-- Stack Trace -->
            <div v-if="selectedEntry.stack_trace">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Stack Trace</h4>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  icon="i-lucide-copy"
                  @click="copyToClipboard(selectedEntry.stack_trace)"
                >
                  Copiar
                </UButton>
              </div>
              <div class="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 max-h-96 overflow-auto">
                <pre class="text-sm text-green-400 whitespace-pre-wrap font-mono break-words">{{ selectedEntry.stack_trace }}</pre>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="neutral"
                @click="copyToClipboard(JSON.stringify(selectedEntry, null, 2))"
                icon="i-lucide-copy"
              >
                Copiar JSON
              </UButton>
              <UButton
                color="primary"
                @click="showDetailModal = false"
              >
                Fechar
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Clear Confirm Modal -->
    <UModal v-model:open="showClearConfirmModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
                <UIcon name="i-lucide-alert-triangle" class="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  Limpar arquivo de log
                </h3>
                <p class="text-sm text-gray-500">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300">
            Tem certeza que deseja limpar o arquivo <strong>{{ selectedFile }}</strong>? 
            Todas as entradas de log serão removidas permanentemente.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="neutral"
                @click="showClearConfirmModal = false"
              >
                Cancelar
              </UButton>
              <UButton
                color="warning"
                @click="handleClearFile"
                :loading="loading"
              >
                Limpar arquivo
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>

    <!-- Delete Confirm Modal -->
    <UModal v-model:open="showDeleteConfirmModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-error-100 dark:bg-error-900">
                <UIcon name="i-lucide-trash-2" class="h-5 w-5 text-error-600 dark:text-error-400" />
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  Excluir arquivo de log
                </h3>
                <p class="text-sm text-gray-500">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>
          </template>

          <p class="text-gray-600 dark:text-gray-300">
            Tem certeza que deseja excluir o arquivo <strong>{{ selectedFile }}</strong>? 
            O arquivo será removido permanentemente do servidor.
          </p>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                variant="ghost"
                color="neutral"
                @click="showDeleteConfirmModal = false"
              >
                Cancelar
              </UButton>
              <UButton
                color="error"
                @click="handleDeleteFile"
                :loading="loading"
              >
                Excluir arquivo
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
