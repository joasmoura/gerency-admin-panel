<script setup lang="ts">
import type { DashboardStats } from '~/composables/useAdminApi';

const { fetchDashboardStats, fetchRecentActivity, loading } = useAdminApi()

const stats = ref<DashboardStats | null>(null)
const recentActivity = ref<any>(null)

// Carrega os dados do dashboard (autenticação verificada pelo middleware)
onMounted(async () => {
  try {
    const [statsData, activityData] = await Promise.all([
      fetchDashboardStats(),
      fetchRecentActivity(),
    ])
    stats.value = statsData
    recentActivity.value = activityData
  } catch (err) {
    console.error('Error loading dashboard:', err)
  }
})

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
  }
  return colors[status] || 'neutral'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Dashboard Administrativo
      </h1>
      <p class="text-gray-500 dark:text-gray-400">
        Visão geral do sistema
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Stats -->
    <template v-else-if="stats">
      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <UIcon name="i-lucide-building-2" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Total Organizações</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.overview.total_tenants }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <UIcon name="i-lucide-users" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Total Usuários</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.overview.total_users }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UIcon name="i-lucide-credit-card" class="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Assinaturas Ativas</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.subscriptions.active }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <UIcon name="i-lucide-dollar-sign" class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">MRR</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ stats.revenue.formatted_mrr }}
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Subscription Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <UCard>
          <template #header>
            <h3 class="font-semibold text-gray-900 dark:text-white">Assinaturas por Status</h3>
          </template>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-green-500"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">Ativas</span>
              </div>
              <span class="font-semibold">{{ stats.subscriptions.active }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-blue-500"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">Em Trial</span>
              </div>
              <span class="font-semibold">{{ stats.subscriptions.trialing }}</span>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 rounded-full bg-purple-500"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">Cortesias</span>
              </div>
              <span class="font-semibold">{{ stats.subscriptions.courtesy }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="font-semibold text-gray-900 dark:text-white">Alertas</h3>
          </template>
          <div class="space-y-3">
            <div class="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-clock" class="w-5 h-5 text-amber-600" />
                <span class="text-sm text-amber-800 dark:text-amber-200">Trials expirando (7 dias)</span>
              </div>
              <UBadge color="warning">{{ stats.alerts.trials_expiring_soon }}</UBadge>
            </div>
            <div class="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-trending-down" class="w-5 h-5 text-red-600" />
                <span class="text-sm text-red-800 dark:text-red-200">Cancelamentos este mês</span>
              </div>
              <UBadge color="error">{{ stats.alerts.churn_this_month }}</UBadge>
            </div>
            <div class="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-trending-up" class="w-5 h-5 text-green-600" />
                <span class="text-sm text-green-800 dark:text-green-200">Novos este mês</span>
              </div>
              <UBadge color="success">{{ stats.overview.new_tenants_this_month }}</UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Recent Activity -->
      <UCard v-if="recentActivity">
        <template #header>
          <h3 class="font-semibold text-gray-900 dark:text-white">Organizações Recentes</h3>
        </template>
        <UTable
          :data="recentActivity.recent_tenants || []"
          :columns="[
            { accessorKey: 'name', header: 'Nome' },
            { accessorKey: 'subscription_status', header: 'Status' },
            { accessorKey: 'created_at', header: 'Criado em' },
          ]"
        >
          <template #subscription_status-cell="{ row }">
            <UBadge 
              :color="getStatusColor(row.subscription_status || 'none')"
              variant="subtle"
            >
              {{ row.subscription_status || 'Sem assinatura' }}
            </UBadge>
            <UBadge v-if="row.is_courtesy" color="secondary" variant="subtle" class="ml-1">
              Cortesia
            </UBadge>
          </template>
          <template #created_at-cell="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </UTable>
      </UCard>
    </template>
  </div>
</template>
