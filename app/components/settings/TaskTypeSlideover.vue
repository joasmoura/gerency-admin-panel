<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { TaskType } from '~/types'

const props = defineProps<{
  taskType?: TaskType | null
}>()

const emit = defineEmits<{
  saved: []
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const isEditing = computed(() => !!props.taskType?.uuid)

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  color: z.string().min(4, 'Cor inválida'),
  icon: z.string().optional(),
  order: z.number().min(0).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const loading = ref(false)
const { createTaskType, updateTaskType } = useTaskTypes()

const state = reactive<Partial<Schema>>({
  name: '',
  color: '#6366f1',
  icon: '',
  order: 0,
  is_default: false,
  is_active: true
})

// Cores predefinidas para seleção
const colorOptions = [
  { label: 'Cinza', value: '#6b7280' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Amarelo', value: '#eab308' },
  { label: 'Verde', value: '#22c55e' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Índigo', value: '#6366f1' },
  { label: 'Roxo', value: '#a855f7' },
  { label: 'Rosa', value: '#ec4899' }
]

// Ícones predefinidos para tipos
const iconOptions = [
  { label: 'Nenhum', value: '' },
  { label: 'Check', value: 'i-lucide-check-square' },
  { label: 'Bug', value: 'i-lucide-bug' },
  { label: 'Sparkles', value: 'i-lucide-sparkles' },
  { label: 'Trending Up', value: 'i-lucide-trending-up' },
  { label: 'File', value: 'i-lucide-file-text' },
  { label: 'Lightbulb', value: 'i-lucide-lightbulb' },
  { label: 'Wrench', value: 'i-lucide-wrench' },
  { label: 'Shield', value: 'i-lucide-shield' },
  { label: 'Zap', value: 'i-lucide-zap' },
  { label: 'Book', value: 'i-lucide-book-open' },
  { label: 'Code', value: 'i-lucide-code' }
]

const resetForm = () => {
  state.name = ''
  state.color = '#6366f1'
  state.icon = ''
  state.order = 0
  state.is_default = false
  state.is_active = true
}

// Observa mudanças no taskType para preencher o formulário
watch(() => props.taskType, (newVal) => {
  if (newVal) {
    state.name = newVal.name
    state.color = newVal.color
    state.icon = newVal.icon || ''
    state.order = newVal.order
    state.is_default = newVal.is_default
    state.is_active = newVal.is_active
  } else {
    resetForm()
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEditing.value && props.taskType) {
      await updateTaskType(props.taskType.uuid, event.data)
    } else {
      await createTaskType(event.data)
    }
    open.value = false
    resetForm()
    emit('saved')
  } catch (error) {
    // Erro já tratado pelo composable
  } finally {
    loading.value = false
  }
}

function handleClose() {
  open.value = false
  emit('close')
  resetForm()
}
</script>

<template>
  <USlideover 
    v-model:open="open" 
    :title="isEditing ? 'Editar Tipo' : 'Novo Tipo'" 
    :description="isEditing ? 'Altere as informações do tipo' : 'Adicione um novo tipo de tarefa'"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <UFormField label="Nome" name="name" required>
          <UInput v-model="state.name" placeholder="Ex: Feature" class="w-full" />
        </UFormField>

        <UFormField label="Cor" name="color">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="colorOpt in colorOptions"
              :key="colorOpt.value"
              type="button"
              class="w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110"
              :class="[
                state.color === colorOpt.value ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-400' : 'border-transparent'
              ]"
              :style="{ backgroundColor: colorOpt.value }"
              :title="colorOpt.label"
              @click="state.color = colorOpt.value"
            />
          </div>
          <div class="mt-3 flex items-center gap-2">
            <span class="text-sm text-gray-500">Personalizada:</span>
            <UInput
              v-model="state.color"
              type="color"
              class="w-10 h-10 p-0 cursor-pointer"
            />
            <UInput
              v-model="state.color"
              class="w-24"
              placeholder="#000000"
            />
          </div>
        </UFormField>

        <UFormField label="Ícone" name="icon">
          <USelectMenu
            v-model="state.icon"
            :items="iconOptions"
            placeholder="Selecione um ícone"
            value-key="value"
          >
            <template #item="{ item }">
              <div class="flex items-center gap-2">
                <UIcon v-if="item.value" :name="item.value" class="w-4 h-4" />
                <span>{{ item.label }}</span>
              </div>
            </template>
          </USelectMenu>
          <div v-if="state.icon" class="mt-2 flex items-center gap-2">
            <span class="text-sm text-gray-500">Preview:</span>
            <UIcon :name="state.icon" class="w-6 h-6" :style="{ color: state.color }" />
          </div>
        </UFormField>

        <UFormField label="Ordem" name="order">
          <UInput
            v-model.number="state.order"
            type="number"
            min="0"
            placeholder="0"
            class="w-24"
          />
        </UFormField>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Tipo padrão</p>
              <p class="text-sm text-gray-500">Novos itens usarão este tipo automaticamente</p>
            </div>
            <USwitch v-model="state.is_default" />
          </div>

          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Ativo</p>
              <p class="text-sm text-gray-500">Tipos inativos não aparecem nas opções</p>
            </div>
            <USwitch v-model="state.is_active" />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <UButton
            variant="ghost"
            @click="handleClose"
          >
            Cancelar
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="loading"
          >
            {{ isEditing ? 'Salvar' : 'Criar' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
