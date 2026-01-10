<script setup lang="ts">
import type { Plan, PlanPrice } from '~/composables/useAdminApi';

const toast = useToast()
const { fetchPlans, createPlan, updatePlan, deactivatePlan, addPlanPrice, loading } = useAdminApi()

const plans = ref<Plan[]>([])
const showCreateModal = ref(false)
const showPriceModal = ref(false)
const editingPlan = ref<Plan | null>(null)
const selectedPlanForPrice = ref<Plan | null>(null)

// Form data
const planForm = ref({
  name: '',
  slug: '',
  description: '',
  max_users: 5,
  max_projects: 10,
  max_storage_gb: 5,
  features: [] as string[],
  trial_days: 14,
  is_featured: false,
  is_active: true,
  sort_order: 0,
  active_prices: [] as { amount: number; interval: 'monthly' | 'yearly'; currency: string }[],
})

const priceForm = ref({
  amount: 0,
  interval: 'monthly' as 'monthly' | 'yearly',
  currency: 'BRL',
  discount_percentage: 0,
})

const newFeature = ref('')

// New price entry for plan form
const newPlanPrice = ref({
  amount: 0,
  interval: 'monthly' as 'monthly' | 'yearly',
  currency: 'BRL',
})

// Carrega os planos (autenticação verificada pelo middleware)
onMounted(async () => {
  await loadPlans()
})

const loadPlans = async () => {
  try {
    plans.value = await fetchPlans()
  } catch (err) {
    console.error('Error loading plans:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar planos',
      color: 'error',
    })
  }
}

const resetPlanForm = () => {
  planForm.value = {
    name: '',
    slug: '',
    description: '',
    max_users: 5,
    max_projects: 10,
    max_storage_gb: 5,
    features: [],
    trial_days: 14,
    is_featured: false,
    is_active: true,
    sort_order: 0,
    active_prices: [],
  }
  editingPlan.value = null
}

const openCreateModal = () => {
  resetPlanForm()
  showCreateModal.value = true
}

const openEditModal = (plan: Plan) => {
  editingPlan.value = plan
  planForm.value = {
    name: plan.name,
    slug: plan.slug,
    description: plan.description || '',
    max_users: plan.max_users,
    max_projects: plan.max_projects,
    max_storage_gb: plan.max_storage_gb,
    features: plan.features || [],
    trial_days: plan.trial_days,
    is_featured: plan.is_featured,
    is_active: plan.is_active,
    sort_order: plan.sort_order || 0,
    active_prices: [],
  }
  showCreateModal.value = true
}

const handleSubmitPlan = async () => {
  try {
    if (editingPlan.value) {
      await updatePlan(editingPlan.value.uuid, planForm.value)
      toast.add({
        title: 'Sucesso',
        description: 'Plano atualizado com sucesso',
        color: 'success',
      })
    } else {
      await createPlan(planForm.value)
      toast.add({
        title: 'Sucesso',
        description: 'Plano criado com sucesso',
        color: 'success',
      })
    }
    showCreateModal.value = false
    await loadPlans()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao salvar plano',
      color: 'error',
    })
  }
}

const handleDeactivate = async (plan: Plan) => {
  if (!confirm(`Deseja realmente desativar o plano "${plan.name}"?`)) return
  
  try {
    await deactivatePlan(plan.uuid)
    toast.add({
      title: 'Sucesso',
      description: 'Plano desativado com sucesso',
      color: 'success',
    })
    await loadPlans()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao desativar plano',
      color: 'error',
    })
  }
}

const openPriceModal = (plan: Plan) => {
  selectedPlanForPrice.value = plan
  priceForm.value = {
    amount: 0,
    interval: 'monthly',
    currency: 'BRL',
    discount_percentage: 0,
  }
  showPriceModal.value = true
}

const handleAddPrice = async () => {
  if (!selectedPlanForPrice.value) return
  
  try {
    await addPlanPrice(selectedPlanForPrice.value.uuid, {
      ...priceForm.value,
      amount: Math.round(priceForm.value.amount * 100), // Convert to cents
    })
    toast.add({
      title: 'Sucesso',
      description: 'Preço adicionado com sucesso',
      color: 'success',
    })
    showPriceModal.value = false
    await loadPlans()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao adicionar preço',
      color: 'error',
    })
  }
}

const addFeature = () => {
  if (newFeature.value.trim()) {
    planForm.value.features.push(newFeature.value.trim())
    newFeature.value = ''
  }
}

const removeFeature = (index: number) => {
  planForm.value.features.splice(index, 1)
}

const addPlanPriceToForm = () => {
  if (newPlanPrice.value.amount > 0) {
    planForm.value.active_prices.push({
      amount: newPlanPrice.value.amount,
      interval: newPlanPrice.value.interval,
      currency: newPlanPrice.value.currency,
    })
    newPlanPrice.value = {
      amount: 0,
      interval: 'monthly',
      currency: 'BRL',
    }
  }
}

const removePlanPriceFromForm = (index: number) => {
  planForm.value.active_prices.splice(index, 1)
}

const formatPrice = (amount: number, currency: string = 'BRL') => {
  const locale = currency === 'USD' ? 'en-US' : 'pt-BR'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(amount / 100)
}

const currencyOptions = [
  { label: 'Real (R$)', value: 'BRL' },
  { label: 'Dólar ($)', value: 'USD' },
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Gerenciar Planos
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Crie e gerencie os planos de assinatura
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="openCreateModal"
      >
        Novo Plano
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Plans List -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard v-for="plan in plans" :key="plan.uuid" :class="{ 'ring-2 ring-primary-500': plan.is_featured }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ plan.name }}</h3>
              <UBadge v-if="plan.is_featured" color="primary" variant="subtle">Destaque</UBadge>
            </div>
            <UBadge :color="plan.is_active ? 'success' : 'error'" variant="subtle">
              {{ plan.is_active ? 'Ativo' : 'Inativo' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ plan.description || 'Sem descrição' }}
          </p>

          <!-- Limits -->
          <div class="space-y-2">
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-users" class="w-4 h-4 text-gray-400" />
              <span>{{ plan.max_users }} usuários</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-folder" class="w-4 h-4 text-gray-400" />
              <span>{{ plan.max_projects }} projetos</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-hard-drive" class="w-4 h-4 text-gray-400" />
              <span>{{ plan.max_storage_gb }} GB de armazenamento</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-lucide-clock" class="w-4 h-4 text-gray-400" />
              <span>{{ plan.trial_days }} dias de trial</span>
            </div>
          </div>

          <!-- Prices -->
          <div class="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Preços</p>
            <div v-if="plan.active_prices && plan.active_prices.length > 0" class="space-y-1">
              <div v-for="price in plan.active_prices" :key="price.uuid" class="flex items-center justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">
                  {{ price.interval === 'monthly' ? 'Mensal' : 'Anual' }}
                  <UBadge size="xs" color="neutral" variant="subtle" class="ml-1">{{ price.currency }}</UBadge>
                </span>
                <span class="font-semibold">{{ formatPrice(price.amount, price.currency) }}</span>
              </div>
            </div>
            <p v-else class="text-sm text-gray-400">Nenhum preço configurado</p>
          </div>

          <!-- Features -->
          <div v-if="plan.features && plan.features.length > 0" class="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p class="text-xs font-semibold text-gray-500 uppercase mb-2">Recursos</p>
            <ul class="space-y-1">
              <li v-for="(feature, i) in plan.features.slice(0, 3)" :key="i" class="flex items-center gap-2 text-sm">
                <UIcon name="i-lucide-check" class="w-4 h-4 text-green-500" />
                <span>{{ feature }}</span>
              </li>
              <li v-if="plan.features.length > 3" class="text-sm text-gray-400">
                +{{ plan.features.length - 3 }} mais...
              </li>
            </ul>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-pencil"
              @click="openEditModal(plan)"
            >
              Editar
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-dollar-sign"
              @click="openPriceModal(plan)"
            >
              Preço
            </UButton>
            <UButton
              v-if="plan.is_active"
              color="error"
              variant="ghost"
              size="sm"
              icon="i-lucide-trash-2"
              @click="handleDeactivate(plan)"
            >
              Desativar
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Create/Edit Plan Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ editingPlan ? 'Editar Plano' : 'Novo Plano' }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="showCreateModal = false"
              />
            </div>
          </template>

          <form @submit.prevent="handleSubmitPlan" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Nome" name="name" required>
                <UInput v-model="planForm.name" placeholder="Plano Pro" />
              </UFormField>
              <UFormField label="Slug" name="slug">
                <UInput v-model="planForm.slug" placeholder="pro" />
              </UFormField>
            </div>

            <UFormField label="Descrição" name="description">
              <UTextarea v-model="planForm.description" placeholder="Descrição do plano..." />
            </UFormField>

            <div class="grid grid-cols-3 gap-4">
              <UFormField label="Máx. Usuários" name="max_users">
                <UInput v-model.number="planForm.max_users" type="number" min="1" />
              </UFormField>
              <UFormField label="Máx. Projetos" name="max_projects">
                <UInput v-model.number="planForm.max_projects" type="number" min="1" />
              </UFormField>
              <UFormField label="Armazenamento (GB)" name="max_storage_gb">
                <UInput v-model.number="planForm.max_storage_gb" type="number" min="1" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Dias de Trial" name="trial_days">
                <UInput v-model.number="planForm.trial_days" type="number" min="0" />
              </UFormField>
              <UFormField label="Ordem de Exibição" name="sort_order">
                <UInput v-model.number="planForm.sort_order" type="number" min="0" />
              </UFormField>
            </div>

            <div class="flex items-center gap-4">
              <UCheckbox v-model="planForm.is_featured" label="Plano em destaque" />
              <UCheckbox v-model="planForm.is_active" label="Plano ativo" />
            </div>

            <!-- Features -->
            <UFormField label="Recursos" name="features">
              <div class="space-y-2">
                <div class="flex gap-2">
                  <UInput 
                    v-model="newFeature" 
                    placeholder="Novo recurso..."
                    @keyup.enter.prevent="addFeature"
                  />
                  <UButton type="button" color="neutral" @click="addFeature">
                    <UIcon name="i-lucide-plus" />
                  </UButton>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="(feature, i) in planForm.features"
                    :key="i"
                    color="neutral"
                    class="cursor-pointer"
                    @click="removeFeature(i)"
                  >
                    {{ feature }}
                    <UIcon name="i-lucide-x" class="w-3 h-3 ml-1" />
                  </UBadge>
                </div>
              </div>
            </UFormField>

            <!-- Prices -->
            <UFormField label="Preços" name="prices">
              <div class="space-y-3">
                <div class="grid grid-cols-4 gap-2">
                  <USelect
                    v-model="newPlanPrice.currency"
                    :items="currencyOptions"
                    placeholder="Moeda"
                  />
                  <UInput 
                    v-model.number="newPlanPrice.amount" 
                    type="number" 
                    min="0" 
                    step="0.01"
                    :placeholder="newPlanPrice.currency === 'USD' ? '9.90' : '49.90'"
                  />
                  <USelect
                    v-model="newPlanPrice.interval"
                    :items="[
                      { label: 'Mensal', value: 'monthly' },
                      { label: 'Anual', value: 'yearly' },
                    ]"
                  />
                  <UButton type="button" color="neutral" @click="addPlanPriceToForm">
                    <UIcon name="i-lucide-plus" />
                  </UButton>
                </div>
                <div v-if="planForm.active_prices.length > 0" class="space-y-2">
                  <div 
                    v-for="(price, i) in planForm.active_prices" 
                    :key="i" 
                    class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div class="flex items-center gap-2">
                      <UBadge color="neutral" variant="subtle">{{ price.currency }}</UBadge>
                      <span class="font-medium">{{ formatPrice(price.amount * 100, price.currency) }}</span>
                      <span class="text-gray-500">/ {{ price.interval === 'monthly' ? 'mês' : 'ano' }}</span>
                    </div>
                    <UButton 
                      type="button" 
                      color="error" 
                      variant="ghost" 
                      size="xs"
                      icon="i-lucide-trash-2"
                      @click="removePlanPriceFromForm(i)"
                    />
                  </div>
                </div>
                <p v-else class="text-sm text-gray-400">Nenhum preço adicionado. Você pode adicionar depois.</p>
              </div>
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton type="button" color="neutral" variant="ghost" @click="showCreateModal = false">
                Cancelar
              </UButton>
              <UButton type="submit" color="primary" :loading="loading">
                {{ editingPlan ? 'Salvar' : 'Criar' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <!-- Add Price Modal -->
    <UModal v-model:open="showPriceModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                Adicionar Preço - {{ selectedPlanForPrice?.name }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="showPriceModal = false"
              />
            </div>
          </template>

          <form @submit.prevent="handleAddPrice" class="space-y-4">
            <UFormField label="Moeda" name="currency" required>
              <USelect
                v-model="priceForm.currency"
                :items="currencyOptions"
              />
            </UFormField>

            <UFormField :label="`Valor (${priceForm.currency === 'USD' ? '$' : 'R$'})`" name="amount" required>
              <UInput 
                v-model.number="priceForm.amount" 
                type="number" 
                min="0" 
                step="0.01"
                :placeholder="priceForm.currency === 'USD' ? '9.90' : '49.90'"
              />
            </UFormField>

            <UFormField label="Período" name="interval" required>
              <USelect
                v-model="priceForm.interval"
                :items="[
                  { label: 'Mensal', value: 'monthly' },
                  { label: 'Anual', value: 'yearly' },
                ]"
              />
            </UFormField>

            <UFormField label="Desconto (%)" name="discount_percentage">
              <UInput 
                v-model.number="priceForm.discount_percentage" 
                type="number" 
                min="0"
                max="100"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-4">
              <UButton type="button" color="neutral" variant="ghost" @click="showPriceModal = false">
                Cancelar
              </UButton>
              <UButton type="submit" color="primary" :loading="loading">
                Adicionar
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
