<script setup lang="ts">
const toast = useToast()
const { fetchImpersonateLogs, fetchActiveImpersonateSessions, endImpersonateSession, loading } = useAdminApi()

const logs = ref<any[]>([])
const activeSessions = ref<any[]>([])
const meta = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })

onMounted(async () => {
  await Promise.all([
    loadLogs(),
    loadActiveSessions(),
  ])
})

const loadLogs = async (page = 1) => {
  try {
    const response = await fetchImpersonateLogs({ page, per_page: 20 })
    logs.value = response.data
    meta.value = response.meta
  } catch (err) {
    console.error('Error loading logs:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar logs de impersonate',
      color: 'error',
    })
  }
}

const loadActiveSessions = async () => {
  try {
    activeSessions.value = await fetchActiveImpersonateSessions()
  } catch (err) {
    console.error('Error loading active sessions:', err)
  }
}

const handleEndSession = async (logUuid: string) => {
  try {
    await endImpersonateSession(logUuid)
    toast.add({
      title: 'Sessão encerrada',
      description: 'A sessão de impersonate foi encerrada',
      color: 'success',
    })
    await Promise.all([loadLogs(), loadActiveSessions()])
  } catch (err) {
    toast.add({
      title: 'Erro',
      description: 'Erro ao encerrar sessão',
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
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Logs de Impersonate
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Histórico de acessos administrativos às contas de usuários
        </p>
      </div>
      <UButton
        color="neutral"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        @click="() => { loadLogs(); loadActiveSessions(); }"
        :loading="loading"
      >
        Atualizar
      </UButton>
    </div>

    <!-- Active Sessions -->
    <UCard v-if="activeSessions.length > 0" class="mb-6">
      <template #header>
        <div class="flex items-center gap-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900">
            <UIcon name="i-lucide-user-cog" class="h-4 w-4 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              Sessões Ativas ({{ activeSessions.length }})
            </h3>
            <p class="text-sm text-gray-500">
              Sessões de impersonate em andamento
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-for="session in activeSessions"
          :key="session.uuid"
          class="flex items-center justify-between p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg border border-warning-200 dark:border-warning-800"
        >
          <div class="flex items-center gap-4">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ session.target_user.name }}
              </p>
              <p class="text-sm text-gray-500">{{ session.target_user.email }}</p>
            </div>
            <div class="text-sm text-gray-500">
              <span>Acessado por: </span>
              <span class="font-medium">{{ session.admin.name }}</span>
            </div>
            <div v-if="session.tenant" class="text-sm text-gray-500">
              <span>Tenant: </span>
              <span class="font-medium">{{ session.tenant.name }}</span>
            </div>
            <div class="text-sm text-gray-500">
              <span>Duração: </span>
              <span class="font-medium">{{ session.duration }}</span>
            </div>
          </div>
          <UButton
            color="error"
            variant="soft"
            size="sm"
            icon="i-lucide-x"
            @click="handleEndSession(session.uuid)"
          >
            Encerrar
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Loading -->
    <div v-if="loading && logs.length === 0" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Logs Table -->
    <UCard v-else>
      <template #header>
        <h3 class="font-semibold text-gray-900 dark:text-white">
          Histórico de Impersonates
        </h3>
      </template>

      <UTable
        :data="logs"
        :columns="[
          { accessorKey: 'admin', header: 'Admin' },
          { accessorKey: 'target_user', header: 'Usuário Acessado' },
          { accessorKey: 'tenant', header: 'Tenant' },
          { accessorKey: 'started_at', header: 'Início' },
          { accessorKey: 'ended_at', header: 'Fim' },
          { accessorKey: 'duration', header: 'Duração' },
        ]"
      >
        <template #admin-cell="{ row }">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ row.original.admin.name }}</p>
            <p class="text-xs text-gray-500">{{ row.original.admin.email }}</p>
          </div>
        </template>
        <template #target_user-cell="{ row }">
          <div>
            <p class="font-medium text-gray-900 dark:text-white">{{ row.original.target_user.name }}</p>
            <p class="text-xs text-gray-500">{{ row.original.target_user.email }}</p>
          </div>
        </template>
        <template #tenant-cell="{ row }">
          <span v-if="row.original.tenant">{{ row.original.tenant.name }}</span>
          <span v-else class="text-gray-400">-</span>
        </template>
        <template #started_at-cell="{ row }">
          {{ formatDate(row.original.started_at) }}
        </template>
        <template #ended_at-cell="{ row }">
          <template v-if="row.original.ended_at">
            {{ formatDate(row.original.ended_at) }}
          </template>
          <UBadge v-else color="warning" variant="subtle">
            Em andamento
          </UBadge>
        </template>
        <template #duration-cell="{ row }">
          {{ row.original.duration || '-' }}
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="meta.last_page > 1" class="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <p class="text-sm text-gray-500">
          Mostrando {{ logs.length }} de {{ meta.total }} registros
        </p>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            :disabled="meta.current_page === 1"
            @click="loadLogs(meta.current_page - 1)"
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
            @click="loadLogs(meta.current_page + 1)"
          >
            Próxima
          </UButton>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && logs.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-user-cog" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Nenhum registro encontrado
        </h3>
        <p class="text-gray-500">
          Ainda não há registros de impersonate no sistema.
        </p>
      </div>
    </UCard>
  </div>
</template>
