<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, SelectMenuItem } from '@nuxt/ui'
import type { Invoice } from '~/types'

const props = defineProps<{
  open: boolean
  invoice?: Invoice | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

// Computed para verificar se é edição ou criação
const isEditing = computed(() => !!props.invoice)

const { createInvoice, updateInvoice, loading, expenseCategories, incomeCategories, types, statuses } = useInvoices()
const { fetchCustomers } = useCustomers()
const { projects, fetchProjects } = useProjects()

// Carregar clientes e projetos
const customers = ref<Array<{ uuid: string; name: string }>>([])

onMounted(async () => {
  try {
    const [customersRes] = await Promise.all([
      fetchCustomers(1),
      fetchProjects(1)
    ])
    customers.value = customersRes.data.map((c: any) => ({ uuid: c.uuid, name: c.name }))
  } catch (error) {
    // Erro tratado
  }
})

// Schema de validação
const schema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Valor deve ser maior que zero'),
  due_date: z.string().min(1, 'Data de vencimento é obrigatória'),
  paid_date: z.string().optional(),
  category: z.string().min(1, 'Selecione uma categoria'),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  customer_id: z.string().optional(),
  project_id: z.string().optional(),
  payment_method: z.string().nullable().optional(),
  invoice_number: z.string().optional(),
  notes: z.string().optional()
})

type Schema = z.output<typeof schema>

// Estado inicial padrão
const defaultState: Partial<Schema> = {
  type: 'expense',
  name: '',
  description: '',
  amount: 0,
  due_date: new Date().toISOString().split('T')[0],
  paid_date: '',
  category: 'other',
  status: 'pending',
  customer_id: '',
  project_id: '',
  payment_method: '',
  invoice_number: '',
  notes: ''
}

// Estado do formulário
const state = ref<Partial<Schema>>({ ...defaultState })

// Opções de tipo
const typeOptions = computed(() => {
  return Object.entries(types).map(([value, label]) => ({
    value,
    label
  }))
})

// Opções de status
const statusOptions = computed(() => {
  return Object.entries(statuses).map(([value, label]) => ({
    value,
    label
  }))
})

// Opções de categoria baseadas no tipo
const categoryOptions = computed(() => {
  const categories = state.value.type === 'income' ? incomeCategories : expenseCategories
  return Object.entries(categories).map(([value, label]) => ({
    value,
    label
  }))
})

// Opções de clientes
const customerOptions = computed(() => {
  return [
    { value: '', label: 'Nenhum' },
    ...customers.value.map(c => ({ value: c.uuid, label: c.name }))
  ]
})

// Opções de projetos
const projectOptions = computed(() => {
  return [
    { value: '', label: 'Nenhum' },
    ...projects.value.map(p => ({ value: p.uuid, label: p.name }))
  ]
})

// Métodos de pagamento
const paymentMethods = [
  { value: null, label: 'Não informado' },
  { value: 'pix', label: 'PIX' },
  { value: 'bank_transfer', label: 'Transferência Bancária' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'other', label: 'Outro' }
] as SelectMenuItem[]

// Carregar dados quando abrir (edição) ou resetar (criação)
watch(() => props.open, (newValue) => {
  if (newValue) {
    if (props.invoice) {
      // Modo edição: carregar dados da fatura
      state.value = {
        type: props.invoice.type,
        name: props.invoice.name,
        description: props.invoice.description || '',
        amount: Number(props.invoice.amount),
        due_date: props.invoice.due_date,
        paid_date: props.invoice.paid_date || '',
        category: props.invoice.category,
        status: props.invoice.status,
        customer_id: props.invoice.customer_id || '',
        project_id: props.invoice.project_id || '',
        payment_method: props.invoice.payment_method || '',
        invoice_number: props.invoice.invoice_number || '',
        notes: props.invoice.notes || ''
      }
    } else {
      // Modo criação: resetar para valores padrão
      resetForm()
    }
  }
}, { immediate: true })

// Reset categoria quando muda tipo (apenas na criação)
watch(() => state.value.type, (newType, oldType) => {
  if (oldType !== undefined && !isEditing.value) {
    state.value.category = 'other'
  }
})

// Submeter formulário
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    const formData = {
      ...event.data,
      amount: Number(event.data.amount),
      customer_id: event.data.customer_id || undefined,
      project_id: event.data.project_id || undefined,
      paid_date: event.data.paid_date || undefined
    }
    
    if (isEditing.value && props.invoice) {
      await updateInvoice(props.invoice.uuid, formData)
    } else {
      await createInvoice(formData)
    }
    
    resetForm()
    emit('update:open', false)
    emit('saved')
  } catch (error) {
    // Erro já tratado no composable
  }
}

// Resetar formulário
function resetForm() {
  state.value = { ...defaultState }
}
</script>

<template>
  <UModal
    :open="open"
    @update:open="emit('update:open', $event)"
    :title="isEditing ? 'Editar Fatura' : 'Nova Fatura'"
    :description="isEditing ? 'Atualize os dados da fatura' : 'Adicione uma nova receita ou despesa'"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Tipo" name="type" required>
          <URadioGroup
            v-model="state.type"
            :items="typeOptions"
            orientation="horizontal"
          />
        </UFormField>

        <UFormField label="Nome" name="name" required>
          <UInput
            v-model="state.name"
            :placeholder="state.type === 'income' ? 'Ex: Pagamento Cliente X' : 'Ex: Conta de Luz'"
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

          <UFormField label="Data de Vencimento" name="due_date" required>
            <UInput
              v-model="state.due_date"
              type="date"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Categoria" name="category" required>
            <USelectMenu
              v-model="state.category"
              :items="categoryOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="isEditing" label="Status" name="status">
            <USelectMenu
              v-model="state.status"
              :items="statusOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <div v-if="state.type === 'income'" class="grid grid-cols-2 gap-4">
          <UFormField label="Cliente" name="customer_id">
            <USelectMenu
              v-model="state.customer_id"
              :items="customerOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Projeto" name="project_id">
            <USelectMenu
              v-model="state.project_id"
              :items="projectOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField v-if="isEditing" label="Data de Pagamento" name="paid_date">
            <UInput
              v-model="state.paid_date"
              type="date"
              class="w-full"
            />
          </UFormField>

          {{ paymentMethods }}
          <UFormField label="Método de Pagamento" name="payment_method">
            <USelectMenu
              v-model="state.payment_method"
              :items="paymentMethods"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="!isEditing" label="Número da Fatura" name="invoice_number">
            <UInput
              v-model="state.invoice_number"
              placeholder="Automático se vazio"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField v-if="isEditing" label="Número da Fatura" name="invoice_number">
          <UInput
            v-model="state.invoice_number"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Observações" name="notes">
          <UTextarea
            v-model="state.notes"
            placeholder="Observações adicionais..."
            :rows="2"
            class="w-full"
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
            {{ isEditing ? 'Salvar Alterações' : 'Criar Fatura' }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
