<script setup lang="ts">
import type { PrivacyPolicy } from '~/composables/useAdminApi'
import { POLICY_TYPES } from '~/composables/useAdminApi'

const toast = useToast()
const router = useRouter()
const { 
  fetchPrivacyPolicies, 
  updatePrivacyPolicy, 
  deletePrivacyPolicy, 
  loading 
} = useAdminApi()

const policies = ref<PrivacyPolicy[]>([])
const meta = ref<any>({})
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const typeFilter = ref<string | null>(null)
const localeFilter = ref<string | null>(null)

// Load policies
onMounted(async () => {
  await loadPolicies()
})

const loadPolicies = async () => {
  try {
    const response = await fetchPrivacyPolicies({
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      type: typeFilter.value || undefined,
      locale: localeFilter.value || undefined,
      per_page: 50,
    })
    policies.value = response.data
    meta.value = response.meta
  } catch (err) {
    console.error('Error loading policies:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar políticas',
      color: 'error',
    })
  }
}

const openCreatePage = () => {
  router.push('/privacy-policies/new')
}

const openEditPage = (policy: PrivacyPolicy) => {
  router.push(`/privacy-policies/${policy.uuid}`)
}

const handleDelete = async (policy: PrivacyPolicy) => {
  if (!confirm(`Deseja realmente excluir "${policy.title}"?`)) return
  
  try {
    await deletePrivacyPolicy(policy.uuid)
    toast.add({
      title: 'Sucesso',
      description: 'Política excluída com sucesso',
      color: 'success',
    })
    await loadPolicies()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao excluir política',
      color: 'error',
    })
  }
}

const handlePublish = async (policy: PrivacyPolicy) => {
  try {
    await updatePrivacyPolicy(policy.uuid, {
      status: 'published',
    })
    toast.add({
      title: 'Sucesso',
      description: 'Política publicada com sucesso',
      color: 'success',
    })
    await loadPolicies()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao publicar política',
      color: 'error',
    })
  }
}

const handleUnpublish = async (policy: PrivacyPolicy) => {
  try {
    await updatePrivacyPolicy(policy.uuid, {
      status: 'draft',
    })
    toast.add({
      title: 'Sucesso',
      description: 'Política despublicada com sucesso',
      color: 'success',
    })
    await loadPolicies()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao despublicar política',
      color: 'error',
    })
  }
}

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadPolicies()
  }, 300)
})

watch([statusFilter, typeFilter, localeFilter], () => {
  loadPolicies()
})

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

const typeOptions = [
  { label: 'Todos os tipos', value: null },
  { label: 'Política de Privacidade', value: 'privacy' },
  { label: 'Termos de Uso', value: 'terms' },
  { label: 'Política de Cookies', value: 'cookies' },
  { label: 'Política de Reembolso', value: 'refund' },
  { label: 'Aviso Legal', value: 'disclaimer' },
]

const localeOptions = [
  { label: 'Todos os idiomas', value: null },
  { label: 'Português (Brasil)', value: 'pt-BR' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

const getLocaleLabel = (locale: string) => {
  const labels: Record<string, string> = {
    'pt-BR': 'PT-BR',
    'en': 'EN',
    'es': 'ES',
  }
  return labels[locale] || locale
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'success'
    case 'draft': return 'warning'
    case 'archived': return 'neutral'
    default: return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'published': return 'Publicado'
    case 'draft': return 'Rascunho'
    case 'archived': return 'Arquivado'
    default: return status
  }
}

const getTypeLabel = (type: string) => {
  return POLICY_TYPES[type as keyof typeof POLICY_TYPES] || type
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    privacy: 'primary',
    terms: 'info',
    cookies: 'warning',
    refund: 'success',
    disclaimer: 'error',
  }
  return colors[type] || 'neutral'
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
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
          Políticas e Termos
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Gerencie políticas de privacidade, termos de uso e outros documentos legais
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="openCreatePage"
      >
        Nova Política
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6 flex-wrap">
      <UInput
        v-model="searchQuery"
        placeholder="Buscar por título..."
        icon="i-lucide-search"
        class="max-w-md"
      />
      <USelect
        v-model="typeFilter"
        :items="typeOptions"
        value-key="value"
        class="w-52"
        placeholder="Tipo"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        class="w-40"
        placeholder="Status"
      />
      <USelect
        v-model="localeFilter"
        :items="localeOptions"
        value-key="value"
        class="w-48"
        placeholder="Idioma"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Empty state -->
    <div v-else-if="policies.length === 0" class="text-center py-20">
      <UIcon name="i-lucide-file-text" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Nenhuma política encontrada
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        Crie sua primeira política de privacidade ou termos de uso
      </p>
      <UButton color="primary" @click="openCreatePage">
        Criar Política
      </UButton>
    </div>

    <!-- Policies Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Título</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Tipo</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Idioma</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Versão</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Publicado em</th>
            <th class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="policy in policies" 
            :key="policy.uuid"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            @click="openEditPage(policy)"
          >
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-violet-400 flex items-center justify-center flex-shrink-0">
                  <UIcon name="i-lucide-scroll-text" class="w-5 h-5 text-white" />
                </div>
                <div>
                  <span class="font-medium text-gray-900 dark:text-white">{{ policy.title }}</span>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ policy.slug }}</p>
                </div>
              </div>
            </td>
            <td class="py-3 px-4">
              <UBadge :color="getTypeColor(policy.type)" variant="subtle" size="sm">
                {{ getTypeLabel(policy.type) }}
              </UBadge>
            </td>
            <td class="py-3 px-4">
              <UBadge color="neutral" variant="subtle" size="sm">
                {{ getLocaleLabel(policy.locale) }}
              </UBadge>
            </td>
            <td class="py-3 px-4">
              <UBadge :color="getStatusColor(policy.status)" variant="subtle" size="sm">
                {{ getStatusLabel(policy.status) }}
              </UBadge>
            </td>
            <td class="py-3 px-4 text-gray-500 dark:text-gray-400">
              {{ policy.version || '-' }}
            </td>
            <td class="py-3 px-4 text-gray-500 dark:text-gray-400">
              {{ formatDate(policy.published_at) }}
            </td>
            <td class="py-3 px-4 text-right" @click.stop>
              <UDropdownMenu :items="[
                { label: 'Editar', icon: 'i-lucide-edit', onSelect: () => openEditPage(policy) },
                policy.status !== 'published' ? 
                  { label: 'Publicar', icon: 'i-lucide-globe', onSelect: () => handlePublish(policy) } : 
                  { label: 'Despublicar', icon: 'i-lucide-eye-off', onSelect: () => handleUnpublish(policy) },
                { label: 'Excluir', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => handleDelete(policy) }
              ]">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-more-horizontal"
                  size="sm"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
