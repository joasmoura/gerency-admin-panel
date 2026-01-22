<script setup lang="ts">
import type { TenantListItem, TenantDetail } from '~/composables/useAdminApi';

const toast = useToast()
const { fetchTenants, fetchTenant, impersonateUser, loading } = useAdminApi()
const config = useRuntimeConfig()

const tenants = ref<TenantListItem[]>([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })
const selectedTenant = ref<TenantDetail | null>(null)
const showDetailModal = ref(false)

// Impersonate state
const showImpersonateModal = ref(false)
const impersonateLoading = ref(false)
const selectedUserForImpersonate = ref<{ uuid: string; name: string; email: string } | null>(null)

// Filters
const search = ref('')
const statusFilter = ref(null)
const courtesyFilter = ref(false)

// Carrega as organizações (autenticação verificada pelo middleware)
onMounted(async () => {
  await loadTenants()
})

const loadTenants = async (page = 1) => {
  try {
    const response = await fetchTenants({
      search: search.value || undefined,
      subscription_status: statusFilter.value || undefined,
      is_courtesy: courtesyFilter.value || undefined,
      page,
      per_page: 20,
    })
    tenants.value = response.data
    meta.value = response.meta
  } catch (err) {
    console.error('Error loading tenants:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar organizações',
      color: 'error',
    })
  }
}

const handleSearch = () => {
  loadTenants(1)
}

const openDetail = async (tenant: TenantListItem) => {
  try {
    selectedTenant.value = await fetchTenant(tenant.uuid)
    showDetailModal.value = true
  } catch (err) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar detalhes',
      color: 'error',
    })
  }
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusColor = (status: string | null) => {
  if (!status) return 'neutral'
  const colors: Record<string, string> = {
    active: 'success',
    trialing: 'info',
    courtesy: 'secondary',
    past_due: 'warning',
    canceled: 'error',
    expired: 'error',
  }
  return colors[status] || 'neutral'
}

const getStatusLabel = (status: string | null) => {
  if (!status) return 'Sem assinatura'
  const labels: Record<string, string> = {
    active: 'Ativo',
    trialing: 'Trial',
    courtesy: 'Cortesia',
    past_due: 'Inadimplente',
    canceled: 'Cancelado',
    expired: 'Expirado',
  }
  return labels[status] || status
}

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Ativo', value: 'active' },
  { label: 'Trial', value: 'trialing' },
  { label: 'Cortesia', value: 'courtesy' },
  { label: 'Inadimplente', value: 'past_due' },
  { label: 'Cancelado', value: 'canceled' },
  { label: 'Expirado', value: 'expired' },
]

// Impersonate functions
const openImpersonateModal = (user: { uuid: string; name: string; email: string }) => {
  selectedUserForImpersonate.value = user
  showImpersonateModal.value = true
}

const confirmImpersonate = async () => {
  if (!selectedUserForImpersonate.value || !selectedTenant.value) return
  
  impersonateLoading.value = true
  try {
    const result = await impersonateUser(
      selectedUserForImpersonate.value.uuid,
      selectedTenant.value.uuid
    )
    
    // Build the URL for the admin app with impersonate token
    const adminAppUrl = config.public.adminAppUrl || 'http://localhost:3000'
    const impersonateUrl = `${adminAppUrl}/auth/impersonate?token=${encodeURIComponent(result.token)}&impersonated_by=${encodeURIComponent(result.impersonated_by.name)}`
    
    // Open in new tab
    window.open(impersonateUrl, '_blank')
    
    toast.add({
      title: 'Impersonate iniciado',
      description: `Acessando como ${selectedUserForImpersonate.value.name}`,
      color: 'success',
    })
    
    showImpersonateModal.value = false
    selectedUserForImpersonate.value = null
  } catch (err: any) {
    console.error('Error impersonating user:', err)
    toast.add({
      title: 'Erro',
      description: err?.data?.message || 'Erro ao iniciar impersonate',
      color: 'error',
    })
  } finally {
    impersonateLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Organizações
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Gerencie as organizações cadastradas
        </p>
      </div>
    </div>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UFormField label="Buscar" class="flex-1">
          <UInput
            v-model="search"
            placeholder="Nome ou slug..."
            icon="i-lucide-search"
            @keyup.enter="handleSearch"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Status">
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            @update:model-value="handleSearch"
             class=""
          />
        </UFormField>
        <UFormField label="Cortesia" class="flex items-center pt-6">
          <UCheckbox v-model="courtesyFilter" label="Apenas cortesias" @update:model-value="handleSearch" />
        </UFormField>
        <UButton color="primary" @click="handleSearch">
          <UIcon name="i-lucide-search" class="mr-1" />
          Filtrar
        </UButton>
      </div>
    </UCard>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Tenants Table -->
    <UCard v-else>
      <UTable
        :data="tenants"
        :columns="[
          { accessorKey: 'name', header: 'Organização' },
          { accessorKey: 'users_count', header: 'Usuários' },
          { accessorKey: 'subscription', header: 'Assinatura' },
          { accessorKey: 'created_at', header: 'Criado em' },
          { accessorKey: 'actions', header: '' },
        ]"
      >
        <template #name-cell="{ row }">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ row.original.name }}</p>
            <p class="text-xs text-gray-500">{{ row.original.slug }}</p>
          </div>
        </template>
        <template #subscription-cell="{ row }">
          <div class="flex items-center gap-2">
            <UBadge 
              :color="getStatusColor(row.original.subscription?.status)"
              variant="subtle"
            >
              {{ getStatusLabel(row.original.subscription?.status) }}
            </UBadge>
            <UBadge v-if="row.original.subscription?.is_courtesy" color="secondary" variant="subtle">
              Cortesia
            </UBadge>
          </div>
          <p v-if="row.original.subscription?.plan_name" class="text-xs text-gray-500 mt-1">
            {{ row.original.subscription.plan_name }}
          </p>
        </template>
        <template #created_at-cell="{ row }">
          {{ formatDate(row.original.created_at) }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-eye"
            @click="openDetail(row.original)"
          >
            Detalhes
          </UButton>
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="meta.last_page > 1" class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <p class="text-sm text-gray-500">
          Mostrando {{ tenants.length }} de {{ meta.total }} organizações
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="meta.current_page === 1"
            @click="loadTenants(meta.current_page - 1)"
          >
            Anterior
          </UButton>
          <span class="text-sm text-gray-500">
            Página {{ meta.current_page }} de {{ meta.last_page }}
          </span>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="meta.current_page === meta.last_page"
            @click="loadTenants(meta.current_page + 1)"
          >
            Próxima
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Detail Modal -->
    <UModal v-model:open="showDetailModal" :ui="{ width: 'max-w-3xl' }">
      <template #content>
        <UCard v-if="selectedTenant">
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ selectedTenant.name }}
                </h3>
                <p class="text-sm text-gray-500">{{ selectedTenant.slug }}</p>
              </div>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="showDetailModal = false"
              />
            </div>
          </template>

          <div class="space-y-6">
            <!-- Info -->
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-500">Criado em</p>
                <p class="font-medium">{{ formatDate(selectedTenant.created_at) }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-500">Onboarding</p>
                <UBadge :color="selectedTenant.onboarding_completed ? 'success' : 'warning'" variant="subtle">
                  {{ selectedTenant.onboarding_completed ? 'Completo' : 'Pendente' }}
                </UBadge>
              </div>
            </div>

            <!-- Users -->
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
                Usuários ({{ selectedTenant.users.length }})
              </h4>
              <div class="space-y-2">
                <div v-for="user in selectedTenant.users" :key="user.uuid" class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <div>
                    <p class="font-medium">{{ user.name }}</p>
                    <p class="text-sm text-gray-500">{{ user.email }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge color="neutral" variant="subtle">{{ user.role }}</UBadge>
                    <UButton
                      color="warning"
                      variant="soft"
                      size="xs"
                      icon="i-lucide-user-cog"
                      @click="openImpersonateModal(user)"
                    >
                      Impersonate
                    </UButton>
                  </div>
                </div>
              </div>
            </div>

            <!-- Subscriptions -->
            <div>
              <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
                Histórico de Assinaturas
              </h4>
              <div class="space-y-3">
                <div v-for="sub in selectedTenant.subscriptions" :key="sub.uuid" class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <UBadge :color="getStatusColor(sub.status)" variant="subtle">
                        {{ getStatusLabel(sub.status) }}
                      </UBadge>
                      <UBadge v-if="sub.is_courtesy" color="secondary" variant="subtle">
                        Cortesia
                      </UBadge>
                    </div>
                    <span class="text-sm text-gray-500">{{ formatDate(sub.created_at) }}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span class="text-gray-500">Plano:</span>
                      <span class="ml-1 font-medium">{{ sub.plan?.name || '-' }}</span>
                    </div>
                    <div v-if="sub.price">
                      <span class="text-gray-500">Preço:</span>
                      <span class="ml-1 font-medium">{{ sub.price.formatted }} / {{ sub.price.interval === 'monthly' ? 'mês' : 'ano' }}</span>
                    </div>
                    <div v-if="sub.trial_ends_at">
                      <span class="text-gray-500">Trial até:</span>
                      <span class="ml-1">{{ formatDate(sub.trial_ends_at) }}</span>
                    </div>
                    <div v-if="sub.current_period_end">
                      <span class="text-gray-500">Período até:</span>
                      <span class="ml-1">{{ formatDate(sub.current_period_end) }}</span>
                    </div>
                    <div v-if="sub.courtesy_reason" class="col-span-2">
                      <span class="text-gray-500">Motivo cortesia:</span>
                      <span class="ml-1">{{ sub.courtesy_reason }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Impersonate Confirmation Modal -->
    <UModal v-model:open="showImpersonateModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
                <UIcon name="i-lucide-user-cog" class="h-5 w-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirmar Impersonate
                </h3>
                <p class="text-sm text-gray-500">
                  Acessar o sistema como outro usuário
                </p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="rounded-lg bg-warning-50 dark:bg-warning-900/20 p-4">
              <div class="flex items-start gap-3">
                <UIcon name="i-lucide-alert-triangle" class="h-5 w-5 text-warning-600 dark:text-warning-400 flex-shrink-0 mt-0.5" />
                <div class="text-sm text-warning-800 dark:text-warning-200">
                  <p class="font-medium mb-1">Atenção</p>
                  <p>
                    Você está prestes a acessar o sistema como outro usuário. 
                    Esta ação será registrada nos logs de auditoria.
                  </p>
                </div>
              </div>
            </div>

            <div v-if="selectedUserForImpersonate" class="space-y-3">
              <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span class="text-sm text-gray-500">Usuário:</span>
                <span class="font-medium">{{ selectedUserForImpersonate.name }}</span>
              </div>
              <div class="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span class="text-sm text-gray-500">Email:</span>
                <span class="font-medium">{{ selectedUserForImpersonate.email }}</span>
              </div>
              <div v-if="selectedTenant" class="flex items-center justify-between py-2">
                <span class="text-sm text-gray-500">Organização:</span>
                <span class="font-medium">{{ selectedTenant.name }}</span>
              </div>
            </div>
          </div>

          <template #footer>
            <div class="flex items-center justify-end gap-3">
              <UButton
                color="neutral"
                variant="ghost"
                @click="showImpersonateModal = false"
              >
                Cancelar
              </UButton>
              <UButton
                color="warning"
                :loading="impersonateLoading"
                icon="i-lucide-user-cog"
                @click="confirmImpersonate"
              >
                Acessar como usuário
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
