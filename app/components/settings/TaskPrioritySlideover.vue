<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { TaskPriority } from '~/types'

const props = defineProps<{
  taskPriority?: TaskPriority | null
}>()

const emit = defineEmits<{
  created: [taskPriority: TaskPriority]
  updated: [taskPriority: TaskPriority]
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const isEditing = computed(() => !!props.taskPriority?.uuid)

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  color: z.string().min(4, 'Cor inválida'),
  icon: z.string().optional(),
  level: z.number().min(0).optional(),
  order: z.number().min(0).optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const loading = ref(false)
const { createTaskPriority, updateTaskPriority } = useTaskPriorities()

const state = reactive<Partial<Schema>>({
  name: '',
  color: '#6366f1',
  icon: '',
  level: 0,
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

// Ícones predefinidos para prioridades
const iconOptions = [
  { label: 'Nenhum', value: '' },
  { label: 'Flag', value: 'i-lucide-flag' },
  { label: 'Alert', value: 'i-lucide-alert-triangle' },
  { label: 'Urgente', value: 'i-lucide-alert-circle' },
  { label: 'Seta para cima', value: 'i-lucide-arrow-up' },
  { label: 'Seta para baixo', value: 'i-lucide-arrow-down' },
  { label: 'Estrela', value: 'i-lucide-star' },
  { label: 'Fogo', value: 'i-lucide-flame' },
  { label: 'Relógio', value: 'i-lucide-clock' }
]

const resetForm = () => {
  state.name = ''
  state.color = '#6366f1'
  state.icon = ''
  state.level = 0
  state.order = 0
  state.is_default = false
  state.is_active = true
}

// Observa mudanças no taskPriority para preencher o formulário
watch(() => props.taskPriority, (newVal) => {
  if (newVal) {
    state.name = newVal.name
    state.color = newVal.color
    state.icon = newVal.icon || ''
    state.level = newVal.level
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
    if (isEditing.value && props.taskPriority) {
      const response = await updateTaskPriority(props.taskPriority.uuid, event.data)
      emit('updated', response.data)
    } else {
      const response = await createTaskPriority(event.data)
      emit('created', response.data)
    }
    open.value = false
    resetForm()
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
  <USlideover v-model:open="open" :title="isEditing ? 'Editar Prioridade' : 'Nova Prioridade'" :description="isEditing ? 'Altere as informações da prioridade' : 'Adicione uma nova prioridade de tarefa'">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <UFormField label="Nome" name="name" required>
          <UInput v-model="state.name" placeholder="Ex: Urgente" class="w-full" />
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
            <span class="text-sm text-gray-500">Ou escolha uma cor:</span>
            <input 
              v-model="state.color" 
              type="color" 
              class="w-10 h-8 rounded cursor-pointer border border-gray-300"
            />
            <span class="text-sm text-gray-600 font-mono">{{ state.color }}</span>
          </div>
        </UFormField>

        <UFormField label="Ícone" name="icon">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="iconOpt in iconOptions"
              :key="iconOpt.value"
              type="button"
              class="w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center"
              :class="[
                state.icon === iconOpt.value ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700'
              ]"
              :title="iconOpt.label"
              @click="state.icon = iconOpt.value"
            >
              <UIcon v-if="iconOpt.value" :name="iconOpt.value" class="w-5 h-5" :style="{ color: state.color }" />
              <span v-else class="text-xs text-gray-400">-</span>
            </button>
          </div>
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Nível de Prioridade" name="level">
            <UInput v-model.number="state.level" type="number" min="0" placeholder="0" class="w-full" />
            <template #hint>
              <span class="text-xs text-gray-500">Maior = mais urgente</span>
            </template>
          </UFormField>

          <UFormField label="Ordem de Exibição" name="order">
            <UInput v-model.number="state.order" type="number" min="0" placeholder="0" class="w-full" />
          </UFormField>
        </div>

        <div class="space-y-4">
          <UFormField name="is_active">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Ativo</p>
                <p class="text-sm text-gray-500">Prioridade disponível para seleção</p>
              </div>
              <USwitch v-model="state.is_active" />
            </div>
          </UFormField>

          <UFormField name="is_default">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Prioridade Padrão</p>
                <p class="text-sm text-gray-500">Será usada como padrão para novas tarefas</p>
              </div>
              <USwitch v-model="state.is_default" />
            </div>
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="subtle"
            @click="handleClose"
          />
          <UButton
            :label="isEditing ? 'Salvar' : 'Criar'"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </USlideover>
</template>
