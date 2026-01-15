<script setup lang="ts">
import type { Plan, TenantListItem } from '~/composables/useAdminApi';

const toast = useToast()
const { 
  fetchCourtesies, 
  fetchPlans, 
  fetchTenants, 
  grantCourtesy,
  updateCourtesy,
  revokeCourtesy, 
  loading 
} = useAdminApi()

const courtesies = ref<any[]>([])
const plans = ref<Plan[]>([])
const tenants = ref<TenantListItem[]>([])

const showFormModal = ref(false)
const isEditing = ref(false)
const selectedCourtesy = ref<any>(null)

const courtesyForm = ref({
  tenant_uuid: '',
  plan_uuid: '',
  expires_at: '',
  reason: '',
  indefinite: false,
})

// Search for tenants
const tenantSearch = ref('')
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

// Carrega os dados (autenticação verificada pelo middleware)
onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  try {
    const [courtesiesData, plansData] = await Promise.all([
      fetchCourtesies(),
      fetchPlans(),
    ])
    courtesies.value = courtesiesData || []
    plans.value = plansData || []
  } catch (err) {
    console.error('Error loading data:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar dados',
      color: 'error',
    })
  }
}

const searchTenants = async (query: string) => {
  if (query.length < 2) return
  
  try {
    const response = await fetchTenants({ search: query, per_page: 10 })
    tenants.value = response.data
  } catch (err) {
    console.error('Error searching tenants:', err)
  }
}

const handleTenantSearch = (value: string) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  searchTimeout.value = setTimeout(() => {
    searchTenants(value)
  }, 300)
}

const resetForm = () => {
  courtesyForm.value = {
    tenant_uuid: '',
    plan_uuid: '',
    expires_at: '',
    reason: '',
    indefinite: false,
  }
  tenantSearch.value = ''
  tenants.value = []
  selectedCourtesy.value = null
  isEditing.value = false
}

const openCreateModal = () => {
  resetForm()
  showFormModal.value = true
}

const openEditModal = (courtesy: any) => {
  resetForm()
  isEditing.value = true
  selectedCourtesy.value = courtesy
  
  courtesyForm.value = {
    tenant_uuid: courtesy.tenant?.uuid || '',
    plan_uuid: courtesy.plan?.uuid || '',
    expires_at: courtesy.expires_at 
      ? new Date(courtesy.expires_at).toISOString().split('T')[0] 
      : '',
    reason: courtesy.courtesy_reason || '',
    indefinite: courtesy.is_indefinite,
  }
  
  tenantSearch.value = courtesy.tenant?.name || ''
  showFormModal.value = true
}

const handleSubmit = async () => {
  if (isEditing.value) {
    await handleUpdate()
  } else {
    await handleCreate()
  }
}

const handleCreate = async () => {
  if (!courtesyForm.value.tenant_uuid || !courtesyForm.value.plan_uuid) {
    toast.add({
      title: 'Erro',
      description: 'Selecione a organização e o plano',
      color: 'error',
    })
    return
  }

  try {
    await grantCourtesy({
      tenant_uuid: courtesyForm.value.tenant_uuid,
      plan_uuid: courtesyForm.value.plan_uuid,
      expires_at: courtesyForm.value.indefinite ? undefined : courtesyForm.value.expires_at || undefined,
      reason: courtesyForm.value.reason || undefined,
    })
    toast.add({
      title: 'Sucesso',
      description: 'Cortesia concedida com sucesso',
      color: 'success',
    })
    showFormModal.value = false
    await loadData()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao conceder cortesia',
      color: 'error',
    })
  }
}

const handleUpdate = async () => {
  if (!selectedCourtesy.value || !courtesyForm.value.plan_uuid) {
    toast.add({
      title: 'Erro',
      description: 'Selecione o plano',
      color: 'error',
    })
    return
  }

  try {
    await updateCourtesy(selectedCourtesy.value.uuid, {
      plan_uuid: courtesyForm.value.plan_uuid,
      expires_at: courtesyForm.value.indefinite ? undefined : courtesyForm.value.expires_at || undefined,
      reason: courtesyForm.value.reason || undefined,
      indefinite: courtesyForm.value.indefinite,
    })
    toast.add({
      title: 'Sucesso',
      description: 'Cortesia atualizada com sucesso',
      color: 'success',
    })
    showFormModal.value = false
    await loadData()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao atualizar cortesia',
      color: 'error',
    })
  }
}

const handleRevoke = async (courtesy: any) => {
  if (!confirm('Deseja realmente revogar esta cortesia?')) return

  try {
    await revokeCourtesy(courtesy.uuid)
    toast.add({
      title: 'Sucesso',
      description: 'Cortesia revogada com sucesso',
      color: 'success',
    })
    await loadData()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao revogar cortesia',
      color: 'error',
    })
  }
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return 'Indefinida'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const isExpired = (dateStr: string | null) => {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

const isExpiringSoon = (dateStr: string | null) => {
  if (!dateStr) return false
  const expiresAt = new Date(dateStr)
  const now = new Date()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return expiresAt > now && expiresAt.getTime() - now.getTime() < sevenDays
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Cortesias
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Gerencie acessos de cortesia para organizações
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-gift"
        @click="openCreateModal"
      >
        Conceder Cortesia
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Courtesies List -->
    <div v-else-if="courtesies.length > 0" class="space-y-4">
      <UCard v-for="courtesy in courtesies" :key="courtesy.uuid">
        <div class="flex items-start justify-between">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="w-5 h-5 text-gray-400" />
              <span class="font-semibold text-gray-900 dark:text-white">
                {{ courtesy.tenant?.name || 'Organização' }}
              </span>
              <UBadge 
                :color="isExpired(courtesy.courtesy_expires_at) ? 'error' : isExpiringSoon(courtesy.courtesy_expires_at) ? 'warning' : 'secondary'" 
                variant="subtle"
              >
                {{ isExpired(courtesy.courtesy_expires_at) ? 'Expirada' : 'Ativa' }}
              </UBadge>
            </div>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p class="text-gray-500">Plano</p>
                <p class="font-medium">{{ courtesy.plan?.name || '-' }}</p>
              </div>
              <div>
                <p class="text-gray-500">Expira em</p>
                <p class="font-medium" :class="{ 'text-red-600': isExpired(courtesy.courtesy_expires_at), 'text-amber-600': isExpiringSoon(courtesy.courtesy_expires_at) }">
                  {{ formatDate(courtesy.courtesy_expires_at) }}
                </p>
              </div>
              <div>
                <p class="text-gray-500">Concedido por</p>
                <p class="font-medium">{{ courtesy.courtesy_granted_by_user?.name || 'Sistema' }}</p>
              </div>
              <div>
                <p class="text-gray-500">Motivo</p>
                <p class="font-medium">{{ courtesy.courtesy_reason || '-' }}</p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UButton
              v-if="!isExpired(courtesy.courtesy_expires_at)"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-pencil"
              @click="openEditModal(courtesy)"
            >
              Editar
            </UButton>
            
            <UButton color="error" variant="ghost" size="sm" icon="i-lucide-x" @click="handleRevoke(courtesy)">
              Revogar
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Empty State -->
    <UCard v-else class="text-center py-12">
      <UIcon name="i-lucide-gift" class="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Nenhuma cortesia ativa
      </h3>
      <p class="text-gray-500 mb-4">
        Conceda cortesias para organizações que precisam de acesso especial.
      </p>
      <UButton color="primary" @click="openCreateModal">
        Conceder Cortesia
      </UButton>
    </UCard>

    <!-- Form Modal (Create/Edit) -->
    <UModal v-model:open="showFormModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ isEditing ? 'Editar Cortesia' : 'Conceder Cortesia' }}</h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="showFormModal = false"
              />
            </div>
          </template>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Tenant search - only for new courtesies -->
            <UFormField v-if="!isEditing" label="Buscar Organização" name="tenant" required>
              <UInput
                v-model="tenantSearch"
                placeholder="Digite para buscar..."
                icon="i-lucide-search"
                @input="handleTenantSearch($event.target.value)"
              />
              <div v-if="tenants.length > 0" class="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
                <button
                  v-for="tenant in tenants"
                  :key="tenant.uuid"
                  type="button"
                  class="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                  :class="{ 'bg-primary-50 dark:bg-primary-900/20': courtesyForm.tenant_uuid === tenant.uuid }"
                  @click="courtesyForm.tenant_uuid = tenant.uuid; tenantSearch = tenant.name"
                >
                  <p class="font-medium">{{ tenant.name }}</p>
                  <p class="text-xs text-gray-500">{{ tenant.slug }}</p>
                </button>
              </div>
            </UFormField>

            <!-- Show tenant name when editing -->
            <div v-else class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p class="text-sm text-gray-500">Organização</p>
              <p class="font-semibold">{{ tenantSearch }}</p>
            </div>

            <UFormField label="Plano" name="plan" required>
              <USelect
                v-model="courtesyForm.plan_uuid"
                :items="plans.map(p => ({ label: p.name, value: p.uuid }))"
                placeholder="Selecione o plano..."
              />
            </UFormField>

            <UFormField>
              <UCheckbox v-model="courtesyForm.indefinite" label="Cortesia indefinida (sem data de expiração)" />
            </UFormField>

            <UFormField v-if="!courtesyForm.indefinite" label="Data de Expiração" name="expires_at">
              <UInput
                v-model="courtesyForm.expires_at"
                type="date"
                :min="new Date().toISOString().split('T')[0]"
              />
            </UFormField>

            <UFormField label="Motivo" name="reason">
              <UTextarea
                v-model="courtesyForm.reason"
                placeholder="Descreva o motivo da cortesia..."
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton type="button" color="neutral" variant="ghost" @click="showFormModal = false">
                Cancelar
              </UButton>
              <UButton type="submit" color="primary" :loading="loading">
                {{ isEditing ? 'Salvar' : 'Conceder' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
