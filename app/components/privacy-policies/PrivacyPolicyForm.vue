<script setup lang="ts">
import type { PrivacyPolicy } from '~/composables/useAdminApi'
import { POLICY_TYPES } from '~/composables/useAdminApi'

interface Props {
  policy?: PrivacyPolicy | null
  loading?: boolean
  isEditMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  policy: null,
  loading: false,
  isEditMode: false,
})

const emit = defineEmits<{
  submit: [form: typeof form.value]
  cancel: []
}>()

// Form data
const form = ref({
  type: 'privacy' as 'privacy' | 'terms' | 'cookies' | 'refund' | 'disclaimer',
  title: '',
  slug: '',
  content: '',
  locale: 'pt-BR',
  status: 'draft' as 'draft' | 'published' | 'archived',
  meta_title: '',
  meta_description: '',
  version: '',
  sort_order: 0,
  is_active: true,
})

// Watch for policy changes and populate form
watch(
  () => props.policy,
  (newPolicy) => {
    if (newPolicy) {
      form.value = {
        type: newPolicy.type,
        title: newPolicy.title,
        slug: newPolicy.slug,
        content: newPolicy.content || '',
        locale: newPolicy.locale || 'pt-BR',
        status: newPolicy.status,
        meta_title: newPolicy.meta_title || '',
        meta_description: newPolicy.meta_description || '',
        version: newPolicy.version || '',
        sort_order: newPolicy.sort_order,
        is_active: newPolicy.is_active,
      }
    }
  },
  { immediate: true }
)

const handleSubmit = () => {
  emit('submit', form.value)
}

const handleCancel = () => {
  emit('cancel')
}

const typeOptions = Object.entries(POLICY_TYPES).map(([value, label]) => ({
  label,
  value,
}))

const statusOptions = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

const localeOptions = [
  { label: 'Português (Brasil)', value: 'pt-BR' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

const pageTitle = computed(() => props.isEditMode ? 'Editar Política' : 'Nova Política')
const pageDescription = computed(() => 
  props.isEditMode 
    ? props.policy?.title || 'Editando política' 
    : 'Crie uma nova política ou termo legal'
)
const submitButtonText = computed(() => props.isEditMode ? 'Salvar Alterações' : 'Criar Política')
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          @click="handleCancel"
        />
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {{ pageTitle }}
          </h1>
          <p class="text-gray-500 dark:text-gray-400">
            {{ pageDescription }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-save"
          :loading="loading"
          @click="handleSubmit"
        >
          {{ submitButtonText }}
        </UButton>
      </div>
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Informações Básicas</h3>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Tipo" name="type" required>
              <USelect
                v-model="form.type"
                :items="typeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Idioma" name="locale" required>
              <USelect
                v-model="form.locale"
                :items="localeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField label="Título" name="title" required>
            <UInput
              v-model="form.title"
              placeholder="Ex: Política de Privacidade"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Slug" name="slug" hint="Deixe em branco para gerar automaticamente">
            <UInput
              v-model="form.slug"
              placeholder="politica-de-privacidade"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Versão" name="version" hint="Ex: 1.0, 2.0">
            <UInput
              v-model="form.version"
              placeholder="1.0"
              class="w-full max-w-xs"
            />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Conteúdo</h3>
        </template>

        <UFormField label="Conteúdo da Política" name="content">
          <RichTextEditor
            v-model="form.content"
            placeholder="Digite o conteúdo da política..."
          />
        </UFormField>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">SEO e Metadados</h3>
        </template>

        <div class="space-y-4">
          <UFormField label="Meta Título" name="meta_title" hint="Título para SEO">
            <UInput
              v-model="form.meta_title"
              placeholder="Título para mecanismos de busca"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Meta Descrição" name="meta_description" hint="Descrição para SEO">
            <UTextarea
              v-model="form.meta_description"
              placeholder="Breve descrição para mecanismos de busca"
              :rows="3"
              class="w-full"
            />
          </UFormField>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Publicação</h3>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField label="Status" name="status">
              <USelect
                v-model="form.status"
                :items="statusOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Ordem de Exibição" name="sort_order">
              <UInput
                v-model.number="form.sort_order"
                type="number"
                min="0"
                class="w-full"
              />
            </UFormField>
          </div>

          <UFormField>
            <UCheckbox
              v-model="form.is_active"
              label="Política ativa"
            />
          </UFormField>
        </div>
      </UCard>
    </form>
  </div>
</template>
