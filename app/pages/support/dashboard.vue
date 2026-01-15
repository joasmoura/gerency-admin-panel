<script setup lang="ts">

const router = useRouter()

const {
  dashboard,
  loading,
  fetchDashboard
} = useAdminSupport()

const periodOptions = [
  { label: 'Últimos 7 dias', value: 7 },
  { label: 'Últimos 30 dias', value: 30 },
  { label: 'Últimos 90 dias', value: 90 }
]

const selectedPeriod = ref(30)

// Fetch data
async function loadDashboard() {
  await fetchDashboard(selectedPeriod.value)
}

watch(selectedPeriod, () => {
  loadDashboard()
})

onMounted(() => {
  loadDashboard()
})

// Helpers
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    open: 'blue',
    in_progress: 'yellow',
    waiting_customer: 'gray',
    resolved: 'green',
    closed: 'gray'
  }
  return colors[status] || 'gray'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    open: 'Aberto',
    in_progress: 'Em Andamento',
    waiting_customer: 'Aguardando',
    resolved: 'Resolvido',
    closed: 'Fechado'
  }
  return labels[status] || status
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    technical: 'Técnico',
    billing: 'Cobrança',
    feature_request: 'Sugestão',
    bug_report: 'Bug',
    account: 'Conta',
    other: 'Outros'
  }
  return labels[category] || category
}

function getPriorityLabel(priority: string) {
  const labels: Record<string, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente'
  }
  return labels[priority] || priority
}

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    low: 'neutral',
    medium: 'info',
    high: 'warning',
    urgent: 'error'
  }
  return colors[priority] || 'neutral'
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatHours(hours: number) {
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const hrs = hours % 24
  return hrs > 0 ? `${days}d ${hrs}h` : `${days}d`
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goToTicket(uuid: string) {
  router.push(`/support/${uuid}`)
}

// Chart data
const ticketTrendData = computed(() => {
  if (!dashboard.value?.trends?.new_tickets) return { labels: [], datasets: [] }
  
  const dates = Object.keys(dashboard.value.trends.new_tickets).sort()
  const newTickets = dates.map(d => dashboard.value!.trends.new_tickets[d] || 0)
  const resolved = dates.map(d => dashboard.value!.trends.resolved[d] || 0)
  
  return {
    labels: dates.map(d => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })),
    datasets: [
      {
        label: 'Novos Tickets',
        data: newTickets,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
      {
        label: 'Resolvidos',
        data: resolved,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
      }
    ]
  }
})

const statusDistribution = computed(() => {
  if (!dashboard.value?.by_status) return []
  
  return Object.entries(dashboard.value.by_status).map(([status, count]) => ({
    label: getStatusLabel(status),
    value: count,
    color: getStatusColor(status)
  }))
})

const categoryDistribution = computed(() => {
  if (!dashboard.value?.by_category) return []
  
  return Object.entries(dashboard.value.by_category).map(([category, count]) => ({
    label: getCategoryLabel(category),
    value: count
  }))
})

const priorityDistribution = computed(() => {
  if (!dashboard.value?.by_priority) return []
  
  return Object.entries(dashboard.value.by_priority).map(([priority, count]) => ({
    label: getPriorityLabel(priority),
    value: count
  }))
})
</script>

<template>
  <UDashboardPanel id="support-dashboard" grow>
    <UDashboardNavbar title="Dashboard de Suporte">
      <template #leading>
        <NuxtLink to="/support">
          <UButton
            icon="i-lucide-arrow-left"
            variant="ghost"
          />
        </NuxtLink>
      </template>
      
      <template #right>
        <USelectMenu
          v-model="selectedPeriod"
          :items="periodOptions"
          value-key="value"
          class="w-44"
        />
      </template>
    </UDashboardNavbar>

    <UDashboardPanelContent v-if="loading" class="flex justify-center items-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
    </UDashboardPanelContent>

    <UDashboardPanelContent v-else-if="dashboard">
      <!-- Overview Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <UCard>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <UIcon name="i-lucide-ticket" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-sm text-muted">Total</p>
              <p class="text-2xl font-semibold">{{ dashboard.overview.total_tickets }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
              <UIcon name="i-lucide-clock" class="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p class="text-sm text-muted">Abertos</p>
              <p class="text-2xl font-semibold">{{ dashboard.overview.open_tickets }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-green-100 dark:bg-green-900">
              <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-sm text-muted">Resolvidos Hoje</p>
              <p class="text-2xl font-semibold">{{ dashboard.overview.resolved_today }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
              <UIcon name="i-lucide-user-x" class="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p class="text-sm text-muted">Não Atribuídos</p>
              <p class="text-2xl font-semibold">{{ dashboard.overview.unassigned }}</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <UIcon name="i-lucide-alert-circle" class="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p class="text-sm text-muted">Sem Resposta</p>
              <p class="text-2xl font-semibold">{{ dashboard.overview.pending_response }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Performance Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <UCard>
          <template #header>
            <h3 class="font-medium">Tempo Médio de Resposta</h3>
          </template>
          <div class="flex items-center justify-center py-6">
            <div class="text-center">
              <p class="text-4xl font-bold text-primary-600 dark:text-primary-400">
                {{ formatMinutes(dashboard.performance.avg_response_time_minutes) }}
              </p>
              <p class="text-sm text-muted mt-1">para primeira resposta</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-medium">Tempo Médio de Resolução</h3>
          </template>
          <div class="flex items-center justify-center py-6">
            <div class="text-center">
              <p class="text-4xl font-bold text-green-600 dark:text-green-400">
                {{ formatHours(dashboard.performance.avg_resolution_time_hours) }}
              </p>
              <p class="text-sm text-muted mt-1">para resolver um ticket</p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <!-- Status Distribution -->
        <UCard>
          <template #header>
            <h3 class="font-medium">Por Status</h3>
          </template>
          <div class="space-y-3">
            <div v-for="item in statusDistribution" :key="item.label" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div 
                  class="w-3 h-3 rounded-full"
                  :class="{
                    'bg-blue-500': item.color === 'blue',
                    'bg-yellow-500': item.color === 'yellow',
                    'bg-green-500': item.color === 'green',
                    'bg-gray-500': item.color === 'gray',
                  }"
                />
                <span class="text-sm">{{ item.label }}</span>
              </div>
              <span class="font-medium">{{ item.value }}</span>
            </div>
          </div>
        </UCard>

        <!-- Category Distribution -->
        <UCard>
          <template #header>
            <h3 class="font-medium">Por Categoria</h3>
          </template>
          <div class="space-y-3">
            <div v-for="item in categoryDistribution" :key="item.label" class="flex items-center justify-between">
              <span class="text-sm">{{ item.label }}</span>
              <span class="font-medium">{{ item.value }}</span>
            </div>
          </div>
        </UCard>

        <!-- Priority Distribution -->
        <UCard>
          <template #header>
            <h3 class="font-medium">Por Prioridade</h3>
          </template>
          <div class="space-y-3">
            <div v-for="item in priorityDistribution" :key="item.label" class="flex items-center justify-between">
              <span class="text-sm">{{ item.label }}</span>
              <span class="font-medium">{{ item.value }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Top Agents -->
        <UCard>
          <template #header>
            <h3 class="font-medium">Top Agentes (Resoluções)</h3>
          </template>
          <div v-if="dashboard.top_agents.length === 0" class="text-center py-6 text-muted">
            Nenhum dado disponível
          </div>
          <div v-else class="space-y-3">
            <div 
              v-for="(agent, index) in dashboard.top_agents" 
              :key="agent.assigned_to" 
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-sm font-medium">
                  {{ index + 1 }}
                </span>
                <UAvatar
                  :src="agent.assigned_to_user?.avatar_url"
                  :alt="agent.assigned_to_user?.name || 'Agent'"
                  size="sm"
                />
                <span class="text-sm">{{ agent.assigned_to_user?.name || 'Agent' }}</span>
              </div>
              <UBadge variant="subtle">{{ agent.resolved_count }} resolvidos</UBadge>
            </div>
          </div>
        </UCard>

        <!-- Urgent Tickets -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="font-medium">Tickets Urgentes/Alta Prioridade</h3>
              <NuxtLink to="/support?priority=urgent">
                <UButton variant="ghost" size="xs" label="Ver todos" />
              </NuxtLink>
            </div>
          </template>
          <div v-if="dashboard.urgent_tickets.length === 0" class="text-center py-6 text-muted">
            Nenhum ticket urgente 🎉
          </div>
          <div v-else class="space-y-3">
            <div 
              v-for="ticket in dashboard.urgent_tickets" 
              :key="ticket.uuid" 
              class="p-3 bg-elevated rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              @click="goToTicket(ticket.uuid)"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-muted font-mono">{{ ticket.ticket_number }}</span>
                <UBadge :color="getPriorityColor(ticket.priority)" size="xs">
                  {{ getPriorityLabel(ticket.priority) }}
                </UBadge>
              </div>
              <p class="text-sm font-medium truncate">{{ ticket.subject }}</p>
              <div class="flex items-center justify-between mt-1 text-xs text-muted">
                <span>{{ ticket.tenant?.name }}</span>
                <span>{{ formatDate(ticket.created_at) }}</span>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </UDashboardPanelContent>
  </UDashboardPanel>
</template>
