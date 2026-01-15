<script setup lang="ts">
import type { AdminSupportTicket } from '~/types/support'

const route = useRoute()
const router = useRouter()
const ticketUuid = route.params.uuid as string

const {
  currentTicket,
  admins,
  loading,
  fetchTicket,
  fetchAdmins,
  updateTicket,
  addResponse
} = useAdminSupport()

const newMessage = ref('')
const isInternalNote = ref(false)
const sendingMessage = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// Fetch data
onMounted(async () => {
  await Promise.all([
    fetchTicket(ticketUuid),
    fetchAdmins()
  ])
})

// Scroll to bottom when messages change
watch(() => currentTicket.value?.messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { immediate: true, deep: true })

// Actions
async function handleSendMessage() {
  if (!newMessage.value.trim() || sendingMessage.value) return

  sendingMessage.value = true
  try {
    await addResponse(ticketUuid, newMessage.value, isInternalNote.value)
    newMessage.value = ''
    isInternalNote.value = false
    await fetchTicket(ticketUuid)
  } finally {
    sendingMessage.value = false
  }
}

async function handleUpdateStatus(status: string) {
  await updateTicket(ticketUuid, { status })
  await fetchTicket(ticketUuid)
}

async function handleUpdatePriority(priority: string) {
  await updateTicket(ticketUuid, { priority })
  await fetchTicket(ticketUuid)
}

async function handleAssign(adminId: number | null) {
  await updateTicket(ticketUuid, { assigned_to: adminId })
  await fetchTicket(ticketUuid)
}

function goBack() {
  router.push('/support')
}

// Options
const statusOptions = [
  { label: 'Aberto', value: 'open' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Aguardando Cliente', value: 'waiting_customer' },
  { label: 'Resolvido', value: 'resolved' },
  { label: 'Fechado', value: 'closed' }
]

const priorityOptions = [
  { label: 'Baixa', value: 'low' },
  { label: 'Média', value: 'medium' },
  { label: 'Alta', value: 'high' },
  { label: 'Urgente', value: 'urgent' }
]

const assignOptions = computed(() => [
  { label: 'Não atribuído', value: null },
  ...admins.value.map(a => ({ label: a.name, value: a.id }))
])

// Helpers
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
    waiting_customer: 'Aguardando Cliente',
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

const isTicketClosed = computed(() => 
  currentTicket.value && ['closed', 'resolved'].includes(currentTicket.value.status)
)
</script>

<template>
  <UDashboardPanel id="support-detail" grow>
    <UDashboardNavbar>
      <template #leading>
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          @click="goBack"
        />
      </template>
      
      <template #title>
        <span v-if="currentTicket" class="font-mono">{{ currentTicket.ticket_number }}</span>
      </template>
      
      <template #right>
        <div v-if="currentTicket" class="flex items-center gap-2">
          <UBadge :color="getStatusColor(currentTicket.status)" size="lg">
            {{ getStatusLabel(currentTicket.status) }}
          </UBadge>
        </div>
      </template>
    </UDashboardNavbar>

    <UDashboardPanelContent v-if="loading" class="flex justify-center items-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted" />
    </UDashboardPanelContent>

    <UDashboardPanelContent v-else-if="currentTicket" class="p-0">
      <div class="grid grid-cols-1 lg:grid-cols-3 h-full">
        <!-- Messages Section -->
        <div class="lg:col-span-2 flex flex-col h-[calc(100vh-8rem)] border-r border-default">
          <!-- Ticket Header -->
          <div class="p-4 border-b border-default">
            <h1 class="text-xl font-semibold mb-2">{{ currentTicket.subject }}</h1>
            <div class="flex flex-wrap items-center gap-2">
              <UBadge :color="getPriorityColor(currentTicket.priority)" variant="subtle">
                {{ getPriorityLabel(currentTicket.priority) }}
              </UBadge>
              <UBadge variant="outline">
                {{ getCategoryLabel(currentTicket.category) }}
              </UBadge>
              <span class="text-sm text-muted">
                Criado em {{ formatDate(currentTicket.created_at) }}
              </span>
            </div>
          </div>

          <!-- Messages -->
          <div 
            ref="messagesContainer" 
            class="flex-1 overflow-y-auto p-4 space-y-4"
          >
            <div
              v-for="message in currentTicket.messages"
              :key="message.uuid"
              :class="[
                'p-4 rounded-lg',
                message.is_internal_note 
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' 
                  : message.is_from_admin 
                    ? 'bg-primary-50 dark:bg-primary-900/20' 
                    : 'bg-elevated'
              ]"
            >
              <div class="flex items-center gap-2 mb-2">
                <UAvatar
                  :src="message.user.avatar_url"
                  :alt="message.user.name"
                  size="sm"
                />
                <div>
                  <span class="font-medium">{{ message.user.name }}</span>
                  <span v-if="message.is_from_admin" class="ml-2 text-xs text-primary-600 dark:text-primary-400">
                    Suporte
                  </span>
                  <span v-if="message.is_internal_note" class="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                    Nota Interna
                  </span>
                </div>
                <span class="text-xs text-muted ml-auto">{{ formatDate(message.created_at) }}</span>
              </div>
              <p class="text-sm whitespace-pre-wrap">{{ message.message }}</p>
            </div>
          </div>

          <!-- Reply Input -->
          <div v-if="!isTicketClosed" class="p-4 border-t border-default">
            <div class="flex items-center gap-2 mb-2">
              <UCheckbox
                v-model="isInternalNote"
                label="Nota interna (não visível para o cliente)"
              />
            </div>
            <div class="flex gap-2">
              <UTextarea
                v-model="newMessage"
                :placeholder="isInternalNote ? 'Adicionar nota interna...' : 'Digite sua resposta...'"
                :rows="3"
                class="flex-1"
                @keydown.ctrl.enter="handleSendMessage"
              />
              <UButton
                icon="i-lucide-send"
                :loading="sendingMessage"
                :disabled="!newMessage.trim()"
                class="self-end"
                @click="handleSendMessage"
              />
            </div>
            <p class="text-xs text-muted mt-1">Ctrl + Enter para enviar</p>
          </div>

          <div v-else class="p-4 border-t border-default text-center">
            <p class="text-sm text-muted mb-2">Este ticket está {{ getStatusLabel(currentTicket.status).toLowerCase() }}</p>
            <UButton
              label="Reabrir Ticket"
              variant="soft"
              size="sm"
              @click="handleUpdateStatus('open')"
            />
          </div>
        </div>

        <!-- Sidebar -->
        <div class="p-4 space-y-6 overflow-y-auto">
          <!-- Customer Info -->
          <div>
            <h3 class="text-sm font-medium text-muted mb-3">Cliente</h3>
            <div class="flex items-center gap-3 mb-2">
              <UAvatar
                :src="currentTicket.user.avatar_url"
                :alt="currentTicket.user.name"
                size="md"
              />
              <div>
                <p class="font-medium">{{ currentTicket.user.name }}</p>
                <p class="text-sm text-muted">{{ currentTicket.user.email }}</p>
              </div>
            </div>
            <div class="mt-2 p-2 bg-muted/50 rounded">
              <p class="text-sm font-medium">{{ currentTicket.tenant.name }}</p>
              <p class="text-xs text-muted font-mono">{{ currentTicket.tenant.uuid }}</p>
            </div>
          </div>

          <!-- Status -->
          <div>
            <h3 class="text-sm font-medium text-muted mb-2">Status</h3>
            <USelectMenu
              :model-value="currentTicket.status"
              :items="statusOptions"
              value-key="value"
              @update:model-value="handleUpdateStatus"
            />
          </div>

          <!-- Priority -->
          <div>
            <h3 class="text-sm font-medium text-muted mb-2">Prioridade</h3>
            <USelectMenu
              :model-value="currentTicket.priority"
              :items="priorityOptions"
              value-key="value"
              @update:model-value="handleUpdatePriority"
            />
          </div>

          <!-- Assigned -->
          <div>
            <h3 class="text-sm font-medium text-muted mb-2">Atribuído para</h3>
            <USelectMenu
              :model-value="currentTicket.assigned_to?.id || null"
              :items="assignOptions"
              value-key="value"
              @update:model-value="handleAssign"
            />
          </div>

          <!-- Metrics -->
          <div>
            <h3 class="text-sm font-medium text-muted mb-3">Métricas</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-muted">Primeira resposta:</span>
                <span>{{ currentTicket.first_response_at ? formatDate(currentTicket.first_response_at) : 'Pendente' }}</span>
              </div>
              <div v-if="currentTicket.resolved_at" class="flex justify-between">
                <span class="text-muted">Resolvido em:</span>
                <span>{{ formatDate(currentTicket.resolved_at) }}</span>
              </div>
              <div v-if="currentTicket.closed_at" class="flex justify-between">
                <span class="text-muted">Fechado em:</span>
                <span>{{ formatDate(currentTicket.closed_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UDashboardPanelContent>
  </UDashboardPanel>
</template>
