<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { TaskStatus } from '~/types'

const props = defineProps<{
  taskStatus?: TaskStatus | null
}>()

const emit = defineEmits<{
  created: [taskStatus: TaskStatus]
  updated: [taskStatus: TaskStatus]
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const isEditing = computed(() => !!props.taskStatus?.uuid)

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  color: z.string().min(4, 'Cor inválida'),
  order: z.number().min(0).optional(),
  is_default: z.boolean().optional(),
  is_completed: z.boolean().optional(),
  is_active: z.boolean().optional()
})

type Schema = z.output<typeof schema>

const loading = ref(false)
const { createTaskStatus, updateTaskStatus } = useTaskStatuses()

const state = reactive<Partial<Schema>>({
  name: '',
  color: '#6366f1',
  order: 0,
  is_default: false,
  is_completed: false,
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

const resetForm = () => {
  state.name = ''
  state.color = '#6366f1'
  state.order = 0
  state.is_default = false
  state.is_completed = false
  state.is_active = true
}

// Observa mudanças no taskStatus para preencher o formulário
watch(() => props.taskStatus, (newVal) => {
  if (newVal) {
    state.name = newVal.name
    state.color = newVal.color
    state.order = newVal.order
    state.is_default = newVal.is_default
    state.is_completed = newVal.is_completed
    state.is_active = newVal.is_active
  } else {
    resetForm()
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    if (isEditing.value && props.taskStatus) {
      const response = await updateTaskStatus(props.taskStatus.uuid, event.data)
      emit('updated', response.data)
    } else {
      const response = await createTaskStatus(event.data)
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
  <USlideover v-model:open="open" :title="isEditing ? 'Editar Status' : 'Novo Status'" :description="isEditing ? 'Altere as informações do status' : 'Adicione um novo status de tarefa'">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <UFormField label="Nome" name="name" required>
          <UInput v-model="state.name" placeholder="Ex: Em Progresso" class="w-full" />
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

        <UFormField label="Ordem de Exibição" name="order">
          <UInput v-model.number="state.order" type="number" min="0" placeholder="0" class="w-full" />
        </UFormField>

        <div class="space-y-4">
          <UFormField name="is_active">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Ativo</p>
                <p class="text-sm text-gray-500">Status disponível para seleção</p>
              </div>
              <USwitch v-model="state.is_active" />
            </div>
          </UFormField>

          <UFormField name="is_default">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Status Padrão</p>
                <p class="text-sm text-gray-500">Será usado como padrão para novas tarefas</p>
              </div>
              <USwitch v-model="state.is_default" />
            </div>
          </UFormField>

          <UFormField name="is_completed">
            <div class="flex items-center justify-between">
              <div>
                <p class="font-medium text-gray-900 dark:text-white">Marca como Concluído</p>
                <p class="text-sm text-gray-500">Indica que a tarefa foi finalizada</p>
              </div>
              <USwitch v-model="state.is_completed" />
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
