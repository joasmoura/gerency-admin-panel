<script setup lang="ts">
import type { AdminSupportTicket } from '~/types/support'

const route = useRoute()
const router = useRouter()

const {
  tickets,
  admins,
  pagination,
  loading,
  fetchTickets,
  fetchAdmins,
  bulkUpdate
} = useAdminSupport()

// Filters
const statusFilter = ref('all')
const categoryFilter = ref('all')
const priorityFilter = ref('all')
const assignedFilter = ref('all')
const searchQuery = ref('')

const statusOptions = [
  { label: 'Todos', value: 'all' },
  { label: 'Abertos', value: 'open' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Aguardando Cliente', value: 'waiting_customer' },
  { label: 'Resolvidos', value: 'resolved' },
  { label: 'Fechados', value: 'closed' }
]

const categoryOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Técnico', value: 'technical' },
  { label: 'Cobrança', value: 'billing' },
  { label: 'Sugestão', value: 'feature_request' },
  { label: 'Bug', value: 'bug_report' },
  { label: 'Conta', value: 'account' },
  { label: 'Outros', value: 'other' }
]

const priorityOptions = [
  { label: 'Todas', value: 'all' },
  { label: 'Baixa', value: 'low' },
  { label: 'Média', value: 'medium' },
  { label: 'Alta', value: 'high' },
  { label: 'Urgente', value: 'urgent' }
]

const assignedOptions = computed(() => [
  { label: 'Todos', value: 'all' },
  { label: 'Não atribuídos', value: 'unassigned' },
  ...admins.value.map(a => ({ label: a.name, value: String(a.id) }))
])

// Selection
const selectedTickets = ref<string[]>([])
const selectAll = ref(false)

watch(selectAll, (val) => {
  selectedTickets.value = val ? tickets.value.map(t => t.uuid) : []
})

// Fetch data
async function loadTickets(page: number = 1) {
  const filters: Record<string, any> = {}
  if (statusFilter.value !== 'all') filters.status = statusFilter.value
  if (categoryFilter.value !== 'all') filters.category = categoryFilter.value
  if (priorityFilter.value !== 'all') filters.priority = priorityFilter.value
  if (assignedFilter.value !== 'all') filters.assigned_to = assignedFilter.value
  if (searchQuery.value) filters.search = searchQuery.value
  
  await fetchTickets(page, filters)
  selectedTickets.value = []
  selectAll.value = false
}

function openTicketDetail(ticket: AdminSupportTicket) {
  router.push(`/support/${ticket.uuid}`)
}

// Bulk actions
async function handleBulkAssign(adminId: string) {
  if (selectedTickets.value.length === 0) return
  await bulkUpdate(selectedTickets.value, 'assign', adminId === 'unassign' ? 'unassign' : Number(adminId))
  loadTickets(pagination.value.current_page)
}

async function handleBulkStatus(status: string) {
  if (selectedTickets.value.length === 0) return
  await bulkUpdate(selectedTickets.value, 'change_status', status)
  loadTickets(pagination.value.current_page)
}

// Watch filters
watch([statusFilter, categoryFilter, priorityFilter, assignedFilter], () => {
  loadTickets()
})

// Debounced search
const debouncedSearch = useDebounceFn(() => {
  loadTickets()
}, 300)

watch(searchQuery, () => {
  debouncedSearch()
})

// Initial load
onMounted(async () => {
  await fetchAdmins()
  await loadTickets()
})

// Helper functions
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    open: 'info',
    in_progress: 'warning',
    waiting_customer: 'neutral',
    resolved: 'success',
    closed: 'neutral'
  }
  return colors[status] || 'neutral'
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

function getPriorityColor(priority: string) {
  const colors: Record<string, string> = {
    low: 'neutral',
    medium: 'info',
    high: 'warning',
    urgent: 'error'
  }
  return colors[priority] || 'neutral'
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimeAgo(date: string) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays < 7) return `${diffDays}d atrás`
  return formatDate(date)
}
</script>

<template>
  <UDashboardPanel id="support-list" grow>
    <UDashboardNavbar title="Tickets de Suporte">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      
      <template #right>
        <NuxtLink to="/support/dashboard">
          <UButton
            icon="i-lucide-bar-chart-3"
            label="Dashboard"
            variant="soft"
          />
        </NuxtLink>
      </template>
    </UDashboardNavbar>

    <UDashboardPanelContent>
      <!-- Filters -->
      <div class="flex flex-col lg:flex-row gap-4 mb-6">
        <UInput
          v-model="searchQuery"
          placeholder="Buscar tickets..."
          icon="i-lucide-search"
          class="lg:w-80"
        />
        
        <div class="flex flex-wrap gap-2">
          <USelectMenu
            v-model="statusFilter"
            :items="statusOptions"
            value-key="value"
            class="w-40"
          />
          
          <USelectMenu
            v-model="categoryFilter"
            :items="categoryOptions"
            value-key="value"
            class="w-36"
          />
          
          <USelectMenu
            v-model="priorityFilter"
            :items="priorityOptions"
            value-key="value"
            class="w-32"
          />
          
          <USelectMenu
            v-model="assignedFilter"
            :items="assignedOptions"
            value-key="value"
            class="w-44"
          />
        </div>
      </div>

      <!-- Bulk Actions -->
      <div v-if="selectedTickets.length > 0" class="flex items-center gap-4 mb-4 p-3 bg-elevated rounded-lg">
        <span class="text-sm text-muted">{{ selectedTickets.length }} selecionados</span>
        
        <UDropdownMenu :items="[
          [
            { label: 'Atribuir para...', type: 'label' },
            { label: 'Remover atribuição', onSelect: () => handleBulkAssign('unassign') },
            ...admins.map(a => ({ label: a.name, onSelect: () => handleBulkAssign(String(a.id)) }))
          ]
        ]">
          <UButton
            label="Atribuir"
            variant="soft"
            size="sm"
            icon="i-lucide-user-plus"
          />
        </UDropdownMenu>

        <UDropdownMenu :items="[
          [
            { label: 'Alterar status para...', type: 'label' },
            { label: 'Aberto', onSelect: () => handleBulkStatus('open') },
            { label: 'Em Andamento', onSelect: () => handleBulkStatus('in_progress') },
            { label: 'Aguardando Cliente', onSelect: () => handleBulkStatus('waiting_customer') },
            { label: 'Resolvido', onSelect: () => handleBulkStatus('resolved') },
            { label: 'Fechado', onSelect: () => handleBulkStatus('closed') },
          ]
        ]">
          <UButton
            label="Alterar Status"
            variant="soft"
            size="sm"
            icon="i-lucide-refresh-cw"
          />
        </UDropdownMenu>
      </div>

      <!-- Tickets Table -->
      <UCard>
        <div v-if="loading" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
        </div>

        <div v-else-if="tickets.length === 0" class="text-center py-12">
          <UIcon name="i-lucide-inbox" class="w-12 h-12 text-muted mx-auto mb-4" />
          <p class="text-muted">Nenhum ticket encontrado</p>
        </div>

        <div v-else>
          <!-- Header -->
          <div class="hidden lg:grid lg:grid-cols-12 gap-4 p-3 bg-muted/50 text-sm font-medium text-muted border-b border-default">
            <div class="col-span-1 flex items-center">
              <UCheckbox v-model="selectAll" />
            </div>
            <div class="col-span-3">Ticket</div>
            <div class="col-span-2">Cliente</div>
            <div class="col-span-2">Status</div>
            <div class="col-span-2">Atribuído</div>
            <div class="col-span-2 text-right">Criado</div>
          </div>

          <!-- Rows -->
          <div class="divide-y divide-default">
            <div
              v-for="ticket in tickets"
              :key="ticket.uuid"
              class="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 hover:bg-elevated cursor-pointer transition-colors items-center"
              @click="openTicketDetail(ticket)"
            >
              <!-- Checkbox -->
              <div class="hidden lg:flex col-span-1" @click.stop>
                <UCheckbox
                  :model-value="selectedTickets.includes(ticket.uuid)"
                  @update:model-value="val => {
                    if (val) {
                      selectedTickets.push(ticket.uuid)
                    } else {
                      selectedTickets = selectedTickets.filter(id => id !== ticket.uuid)
                    }
                  }"
                />
              </div>

              <!-- Ticket Info -->
              <div class="lg:col-span-3">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-xs text-muted font-mono">{{ ticket.ticket_number }}</span>
                  <UBadge :color="getPriorityColor(ticket.priority)" variant="subtle" size="xs">
                    {{ getPriorityLabel(ticket.priority) }}
                  </UBadge>
                </div>
                <p class="font-medium truncate">{{ ticket.subject }}</p>
                <p class="text-xs text-muted mt-1">{{ getCategoryLabel(ticket.category) }}</p>
              </div>

              <!-- Customer -->
              <div class="lg:col-span-2">
                <div class="flex items-center gap-2">
                  <UAvatar
                    :src="ticket.user.avatar_url"
                    :alt="ticket.user.name"
                    size="xs"
                  />
                  <div class="min-w-0">
                    <p class="text-sm truncate">{{ ticket.user.name }}</p>
                    <p class="text-xs text-muted truncate">{{ ticket.tenant.name }}</p>
                  </div>
                </div>
              </div>

              <!-- Status -->
              <div class="lg:col-span-2">
                <UBadge :color="getStatusColor(ticket.status)" size="sm">
                  {{ getStatusLabel(ticket.status) }}
                </UBadge>
              </div>

              <!-- Assigned -->
              <div class="lg:col-span-2">
                <div v-if="ticket.assigned_to" class="flex items-center gap-2">
                  <UAvatar
                    :src="ticket.assigned_to.avatar_url"
                    :alt="ticket.assigned_to.name"
                    size="xs"
                  />
                  <span class="text-sm truncate">{{ ticket.assigned_to.name }}</span>
                </div>
                <span v-else class="text-sm text-muted">Não atribuído</span>
              </div>

              <!-- Date -->
              <div class="lg:col-span-2 lg:text-right">
                <p class="text-sm">{{ formatTimeAgo(ticket.created_at) }}</p>
                <p v-if="!ticket.first_response_at && ticket.status === 'open'" class="text-xs text-error">
                  Sem resposta
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="pagination.last_page > 1" class="flex justify-center pt-4 border-t border-default">
          <UPagination
            :default-page="pagination.current_page"
            :total="pagination.total"
            :items-per-page="pagination.per_page"
            @update:page="loadTickets"
          />
        </div>
      </UCard>
    </UDashboardPanelContent>
  </UDashboardPanel>
</template>
