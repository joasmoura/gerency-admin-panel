<script setup lang="ts">

const toast = useToast()
const { fetchSubscriptions, loading } = useAdminApi()

const subscriptions = ref<any[]>([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })

// Filters
const statusFilter = ref(null)

// Carrega as assinaturas (autenticação verificada pelo middleware)
onMounted(async () => {
  await loadSubscriptions()
})

const loadSubscriptions = async (page = 1) => {
  try {
    const response = await fetchSubscriptions({
      status: statusFilter.value || undefined,
      page,
      per_page: 20,
    })
    subscriptions.value = response.data
    
    meta.value.current_page = response.current_page
    meta.value.last_page = response.last_page
    meta.value.per_page = response.per_page
    meta.value.total = response.total
  } catch (err) {
    console.error('Error loading subscriptions:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar assinaturas',
      color: 'error',
    })
  }
}

const handleFilter = () => {
  loadSubscriptions(1)
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    trialing: 'info',
    courtesy: 'secondary',
    past_due: 'warning',
    canceled: 'error',
    expired: 'error',
    incomplete: 'neutral',
    unpaid: 'error',
  }
  return colors[status] || 'neutral'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: 'Ativo',
    trialing: 'Trial',
    courtesy: 'Cortesia',
    past_due: 'Inadimplente',
    canceled: 'Cancelado',
    expired: 'Expirado',
    incomplete: 'Incompleto',
    unpaid: 'Não pago',
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

// Stats
const stats = computed(() => {
  const all = subscriptions.value
  // console.log('meta', meta.value)
  return {
    active: all.filter(s => s.status === 'active').length,
    trialing: all.filter(s => s.status === 'trialing').length,
    courtesy: all.filter(s => s.is_courtesy).length,
    total: meta.value.total || 0,
  }
})
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Assinaturas
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Visualize e gerencie todas as assinaturas do sistema
        </p>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <UCard class="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-green-500 rounded-lg">
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-xs text-green-600 dark:text-green-400 font-medium">Ativas</p>
            <p class="text-xl font-bold text-green-700 dark:text-green-300">{{ stats.active }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-blue-500 rounded-lg">
            <UIcon name="i-lucide-clock" class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-xs text-blue-600 dark:text-blue-400 font-medium">Em Trial</p>
            <p class="text-xl font-bold text-blue-700 dark:text-blue-300">{{ stats.trialing }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-purple-500 rounded-lg">
            <UIcon name="i-lucide-gift" class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-xs text-purple-600 dark:text-purple-400 font-medium">Cortesias</p>
            <p class="text-xl font-bold text-purple-700 dark:text-purple-300">{{ stats.courtesy }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-gray-500 rounded-lg">
            <UIcon name="i-lucide-list" class="w-5 h-5 text-white" />
          </div>
          <div>
            <p class="text-xs text-gray-600 dark:text-gray-400 font-medium">Total</p>
            <p class="text-xl font-bold text-gray-700 dark:text-gray-300">{{ stats.total }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <UCard class="mb-6">
      <div class="flex items-end gap-4">
        <UFormField label="Status" class="w-48">
          <USelect
            v-model="statusFilter"
            :items="statusOptions"
            @update:model-value="handleFilter"
          />
        </UFormField>
      </div>
    </UCard>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Subscriptions Table -->
    <UCard v-else>
      <UTable
        :data="subscriptions"
        :columns="[
          { accessorKey: 'tenant_name', header: 'Organização' },
          { accessorKey: 'plan_name', header: 'Plano' },
          { accessorKey: 'status', header: 'Status' },
          { accessorKey: 'current_period_end', header: 'Expira em' },
          { accessorKey: 'created_at', header: 'Criado em' },
        ]"
      >
        <template #tenant_name-cell="{ row }">
          <NuxtLink 
            :to="`/tenants?search=${row.original.tenant.uuid}`"
            class="font-medium text-primary-600 hover:text-primary-700"
          >
            {{ row.original.tenant.name }}
          </NuxtLink>
        </template>
        <template #plan_name-cell="{ row }">
          {{ row.original.plan.name || '-' }}
        </template>
        <template #status-cell="{ row }">
          <div class="flex items-center gap-2">
            <UBadge 
              :color="getStatusColor(row.original.status)"
              variant="subtle"
            >
              {{ getStatusLabel(row.original.status) }}
            </UBadge>
            <UBadge v-if="row.original.is_courtesy" color="secondary" variant="subtle">
              Cortesia
            </UBadge>
          </div>
        </template>
        <template #current_period_end-cell="{ row }">
          {{ formatDate(row.original.current_period_end) }}
        </template>
        <template #created_at-cell="{ row }">
          {{ formatDate(row.original.created_at) }}
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="meta.last_page > 1" class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <p class="text-sm text-gray-500">
          Mostrando {{ subscriptions.length }} de {{ meta.total }} assinaturas
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="meta.current_page === 1"
            @click="loadSubscriptions(meta.current_page - 1)"
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
            @click="loadSubscriptions(meta.current_page + 1)"
          >
            Próxima
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
