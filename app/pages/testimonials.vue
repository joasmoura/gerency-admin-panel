<script setup lang="ts">
import type { Testimonial } from '~/composables/useAdminApi';

const toast = useToast()
const { 
  fetchTestimonials, 
  createTestimonial, 
  updateTestimonial, 
  deleteTestimonial, 
  loading 
} = useAdminApi()

const testimonials = ref<Testimonial[]>([])
const meta = ref<any>({})
const showModal = ref(false)
const editingTestimonial = ref<Testimonial | null>(null)
const searchQuery = ref('')

// Form data
const form = ref({
  author_name: '',
  author_role: '',
  author_company: '',
  author_avatar: '',
  quote: '',
  rating: 5,
  sort_order: 0,
  is_active: true,
  is_featured: false,
})

// Load testimonials
onMounted(async () => {
  await loadTestimonials()
})

const loadTestimonials = async () => {
  try {
    const response = await fetchTestimonials({
      search: searchQuery.value || undefined,
      per_page: 50,
    })
    testimonials.value = response.data
    meta.value = response.meta
  } catch (err) {
    console.error('Error loading testimonials:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar depoimentos',
      color: 'error',
    })
  }
}

const resetForm = () => {
  form.value = {
    author_name: '',
    author_role: '',
    author_company: '',
    author_avatar: '',
    quote: '',
    rating: 5,
    sort_order: 0,
    is_active: true,
    is_featured: false,
  }
  editingTestimonial.value = null
}

const openCreateModal = () => {
  resetForm()
  showModal.value = true
}

const openEditModal = (testimonial: Testimonial) => {
  editingTestimonial.value = testimonial
  form.value = {
    author_name: testimonial.author_name,
    author_role: testimonial.author_role || '',
    author_company: testimonial.author_company || '',
    author_avatar: testimonial.author_avatar || '',
    quote: testimonial.quote,
    rating: testimonial.rating,
    sort_order: testimonial.sort_order,
    is_active: testimonial.is_active,
    is_featured: testimonial.is_featured,
  }
  showModal.value = true
}

const handleSubmit = async () => {
  try {
    if (editingTestimonial.value) {
      await updateTestimonial(editingTestimonial.value.uuid, form.value)
      toast.add({
        title: 'Sucesso',
        description: 'Depoimento atualizado com sucesso',
        color: 'success',
      })
    } else {
      await createTestimonial(form.value)
      toast.add({
        title: 'Sucesso',
        description: 'Depoimento criado com sucesso',
        color: 'success',
      })
    }
    showModal.value = false
    await loadTestimonials()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao salvar depoimento',
      color: 'error',
    })
  }
}

const handleDelete = async (testimonial: Testimonial) => {
  if (!confirm(`Deseja realmente excluir o depoimento de "${testimonial.author_name}"?`)) return
  
  try {
    await deleteTestimonial(testimonial.uuid)
    toast.add({
      title: 'Sucesso',
      description: 'Depoimento excluído com sucesso',
      color: 'success',
    })
    await loadTestimonials()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao excluir depoimento',
      color: 'error',
    })
  }
}

const handleToggleActive = async (testimonial: Testimonial) => {
  try {
    await updateTestimonial(testimonial.uuid, {
      is_active: !testimonial.is_active,
    })
    toast.add({
      title: 'Sucesso',
      description: `Depoimento ${!testimonial.is_active ? 'ativado' : 'desativado'} com sucesso`,
      color: 'success',
    })
    await loadTestimonials()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao atualizar status',
      color: 'error',
    })
  }
}

const handleToggleFeatured = async (testimonial: Testimonial) => {
  try {
    await updateTestimonial(testimonial.uuid, {
      is_featured: !testimonial.is_featured,
    })
    toast.add({
      title: 'Sucesso',
      description: `Depoimento ${!testimonial.is_featured ? 'destacado' : 'removido do destaque'} com sucesso`,
      color: 'success',
    })
    await loadTestimonials()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao atualizar destaque',
      color: 'error',
    })
  }
}

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadTestimonials()
  }, 300)
})

const ratingOptions = [
  { label: '1 estrela', value: 1 },
  { label: '2 estrelas', value: 2 },
  { label: '3 estrelas', value: 3 },
  { label: '4 estrelas', value: 4 },
  { label: '5 estrelas', value: 5 },
]
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Depoimentos
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Gerencie os depoimentos exibidos no site
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="openCreateModal"
      >
        Novo Depoimento
      </UButton>
    </div>

    <!-- Search -->
    <div class="mb-6">
      <UInput
        v-model="searchQuery"
        placeholder="Buscar por nome, empresa ou texto..."
        icon="i-lucide-search"
        class="max-w-md"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Empty state -->
    <div v-else-if="testimonials.length === 0" class="text-center py-20">
      <UIcon name="i-lucide-message-square-quote" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Nenhum depoimento encontrado
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        Adicione depoimentos para exibir no site
      </p>
      <UButton color="primary" @click="openCreateModal">
        Adicionar Depoimento
      </UButton>
    </div>

    <!-- Testimonials Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard 
        v-for="testimonial in testimonials" 
        :key="testimonial.uuid" 
        :class="{ 'ring-2 ring-primary-500': testimonial.is_featured }"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <!-- Avatar -->
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-400 flex items-center justify-center text-white font-bold">
                {{ testimonial.author_name.charAt(0) }}
              </div>
              <div>
                <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
                  {{ testimonial.author_name }}
                </h3>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ testimonial.author_role }}
                  <span v-if="testimonial.author_company"> • {{ testimonial.author_company }}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-1">
              <UBadge v-if="testimonial.is_featured" color="primary" variant="subtle" size="xs">
                Destaque
              </UBadge>
              <UBadge :color="testimonial.is_active ? 'success' : 'error'" variant="subtle" size="xs">
                {{ testimonial.is_active ? 'Ativo' : 'Inativo' }}
              </UBadge>
            </div>
          </div>
        </template>

        <div class="space-y-3">
          <!-- Stars -->
          <div class="flex gap-0.5">
            <UIcon
              v-for="i in 5"
              :key="i"
              name="i-lucide-star"
              :class="[
                'w-4 h-4',
                i <= testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'
              ]"
            />
          </div>

          <!-- Quote -->
          <blockquote class="text-sm text-gray-600 dark:text-gray-300 italic line-clamp-4">
            "{{ testimonial.quote }}"
          </blockquote>

          <!-- Order -->
          <div class="text-xs text-gray-400">
            Ordem: {{ testimonial.sort_order }}
          </div>
        </div>

        <template #footer>
          <div class="flex items-center gap-1 flex-wrap">
            <UButton
              color="neutral"
              variant="ghost"
              size="xs"
              icon="i-lucide-pencil"
              @click="openEditModal(testimonial)"
            >
              Editar
            </UButton>
            <UButton
              :color="testimonial.is_active ? 'warning' : 'success'"
              variant="ghost"
              size="xs"
              :icon="testimonial.is_active ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              @click="handleToggleActive(testimonial)"
            >
              {{ testimonial.is_active ? 'Desativar' : 'Ativar' }}
            </UButton>
            <UButton
              :color="testimonial.is_featured ? 'neutral' : 'primary'"
              variant="ghost"
              size="xs"
              :icon="testimonial.is_featured ? 'i-lucide-star-off' : 'i-lucide-star'"
              @click="handleToggleFeatured(testimonial)"
            >
              {{ testimonial.is_featured ? 'Remover destaque' : 'Destacar' }}
            </UButton>
            <UButton
              color="error"
              variant="ghost"
              size="xs"
              icon="i-lucide-trash-2"
              @click="handleDelete(testimonial)"
            >
              Excluir
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Create/Edit Modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ editingTestimonial ? 'Editar Depoimento' : 'Novo Depoimento' }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="showModal = false"
              />
            </div>
          </template>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Nome do Autor" name="author_name" required>
                <UInput v-model="form.author_name" placeholder="João Silva" />
              </UFormField>
              <UFormField label="Cargo" name="author_role">
                <UInput v-model="form.author_role" placeholder="CEO" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Empresa" name="author_company">
                <UInput v-model="form.author_company" placeholder="Empresa XYZ" />
              </UFormField>
              <UFormField label="URL do Avatar" name="author_avatar">
                <UInput v-model="form.author_avatar" placeholder="https://..." />
              </UFormField>
            </div>

            <UFormField label="Depoimento" name="quote" required>
              <UTextarea 
                v-model="form.quote" 
                placeholder="O que o cliente disse sobre o produto..." 
                :rows="4"
              />
            </UFormField>

            <div class="grid grid-cols-3 gap-4">
              <UFormField label="Avaliação" name="rating">
                <USelect 
                  v-model="form.rating" 
                  :items="ratingOptions"
                  value-key="value"
                />
              </UFormField>
              <UFormField label="Ordem" name="sort_order">
                <UInput v-model.number="form.sort_order" type="number" min="0" />
              </UFormField>
            </div>

            <div class="flex items-center gap-6">
              <UCheckbox v-model="form.is_active" label="Ativo" />
              <UCheckbox v-model="form.is_featured" label="Destaque" />
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton
                color="neutral"
                variant="ghost"
                @click="showModal = false"
              >
                Cancelar
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :loading="loading"
              >
                {{ editingTestimonial ? 'Atualizar' : 'Criar' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
