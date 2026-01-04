<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { ExpenseCategory } from '~/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const toast = useToast()
const { createFixedExpense, loading, categories } = useFixedExpenses()

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
const state = ref<Partial<Schema>>({
  name: '',
  description: '',
  amount: 0,
  due_day: 1,
  category: 'other',
  is_active: true,
  start_date: '',
  end_date: ''
})

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

// Submeter formulário
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const formData = {
      ...event.data,
      amount: Number(event.data.amount),
      due_day: Number(event.data.due_day)
    }
    
    await createFixedExpense(formData)
    resetForm()
    emit('update:open', false)
    emit('created')
  } catch (error) {
    // Erro já tratado no composable
  }
}

// Resetar formulário
function resetForm() {
  state.value = {
    name: '',
    description: '',
    amount: 0,
    due_day: 1,
    category: 'other',
    is_active: true,
    start_date: '',
    end_date: ''
  }
}

// Resetar ao fechar
watch(() => props.open, (newValue) => {
  if (!newValue) {
    resetForm()
  }
})
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
    title="Nova Despesa Fixa"
    description="Crie uma nova despesa recorrente mensal"
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
            Criar Despesa
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
