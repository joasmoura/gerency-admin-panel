<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { FixedExpense, ExpenseCategory } from '~/types'

const props = defineProps<{
  open: boolean
  fixedExpense: FixedExpense
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'updated': []
}>()

const toast = useToast()
const { updateFixedExpense, loading, categories } = useFixedExpenses()

// Schema de validação
const schema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
  due_day: z.number().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31'),
  category: z.enum(['utilities', 'rent', 'internet', 'software', 'insurance', 'taxes', 'payroll', 'marketing', 'maintenance', 'office', 'transport', 'equipment', 'other']),
  is_active: z.boolean().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional()
})

type Schema = z.output<typeof schema>

// Estado do formulário
const state = ref<Partial<Schema>>({})

// Opções de categoria
const categoryOptions = computed(() => {
  return Object.entries(categories).map(([value, label]) => ({
    value,
    label
  }))
})

// Opções de dias
const dayOptions = computed(() => {
  return Array.from({ length: 31 }, (_, i) => ({
    value: i + 1,
    label: `Dia ${i + 1}`
  }))
})

// Carregar dados quando abrir
watch(() => props.open, (newValue) => {
  if (newValue && props.fixedExpense) {
    state.value = {
      name: props.fixedExpense.name,
      description: props.fixedExpense.description || '',
      amount: Number(props.fixedExpense.amount),
      due_day: props.fixedExpense.due_day,
      category: props.fixedExpense.category,
      is_active: props.fixedExpense.is_active,
      start_date: props.fixedExpense.start_date || '',
      end_date: props.fixedExpense.end_date || ''
    }
  }
}, { immediate: true })

// Submeter formulário
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const formData = {
      ...event.data,
      amount: Number(event.data.amount),
      due_day: Number(event.data.due_day)
    }
    
    await updateFixedExpense(props.fixedExpense.uuid, formData)
    emit('update:open', false)
    emit('updated')
  } catch (error) {
    // Erro já tratado no composable
  }
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
    title="Editar Despesa Fixa"
    description="Atualize os dados da despesa recorrente"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Nome" name="name" required>
          <UInput
            v-model="state.name"
            placeholder="Ex: Aluguel"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Descrição" name="description">
          <UTextarea
            v-model="state.description"
            placeholder="Descrição opcional..."
            :rows="2"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Valor (R$)" name="amount" required>
            <UInput
              v-model="state.amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Dia do Vencimento" name="due_day" required>
            <USelect
              v-model="state.due_day"
              :items="dayOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Categoria" name="category" required>
          <USelect
            v-model="state.category"
            :items="categoryOptions"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Data Início (opcional)" name="start_date">
            <UInput
              v-model="state.start_date"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Data Fim (opcional)" name="end_date">
            <UInput
              v-model="state.end_date"
              type="date"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField name="is_active">
          <UCheckbox
            v-model="state.is_active"
            label="Despesa ativa"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            color="neutral"
            variant="ghost"
            @click="emit('update:open', false)"
          >
            Cancelar
          </UButton>
          <UButton
            type="submit"
            :loading="loading"
          >
            Salvar Alterações
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
