<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Customer } from '~/types'

const emit = defineEmits<{
  created: [customer: Customer]
}>()

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  document: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).default('active'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional()
})

type Schema = z.output<typeof schema>

const open = ref(false)
const loading = ref(false)
const { createCustomer } = useCustomers()

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  phone: '',
  document: '',
  company: '',
  status: 'active',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'Brasil',
  notes: ''
})

const resetForm = () => {
  state.name = ''
  state.email = ''
  state.phone = ''
  state.document = ''
  state.company = ''
  state.status = 'active'
  state.address = ''
  state.city = ''
  state.state = ''
  state.zip_code = ''
  state.country = 'Brasil'
  state.notes = ''
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    const response = await createCustomer(event.data)
    emit('created', response.data)
    open.value = false
    resetForm()
  } catch (error) {
    // Erro já tratado pelo composable
  } finally {
    loading.value = false
  }
}

const statusOptions = [
  { label: 'Ativo', value: 'active' },
  { label: 'Inativo', value: 'inactive' },
  { label: 'Bloqueado', value: 'blocked' }
]
</script>

<template>
  <UModal v-model:open="open" title="Novo Cliente" description="Adicione um novo cliente ao sistema">
    <UButton label="Novo cliente" icon="i-lucide-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Nome" name="name" required>
            <UInput v-model="state.name" placeholder="Nome do cliente" class="w-full" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" placeholder="email@exemplo.com" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Telefone" name="phone">
            <UInput v-model="state.phone" placeholder="(00) 00000-0000" class="w-full" />
          </UFormField>
          <UFormField label="CPF/CNPJ" name="document">
            <UInput v-model="state.document" placeholder="000.000.000-00" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Empresa" name="company">
            <UInput v-model="state.company" placeholder="Nome da empresa" class="w-full" />
          </UFormField>
          <UFormField label="Status" name="status">
            <USelect v-model="state.status" :items="statusOptions" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Endereço" name="address">
          <UInput v-model="state.address" placeholder="Rua, número, complemento" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UFormField label="Cidade" name="city">
            <UInput v-model="state.city" placeholder="Cidade" class="w-full" />
          </UFormField>
          <UFormField label="Estado" name="state">
            <UInput v-model="state.state" placeholder="UF" class="w-full" />
          </UFormField>
          <UFormField label="CEP" name="zip_code">
            <UInput v-model="state.zip_code" placeholder="00000-000" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Observações" name="notes">
          <UTextarea v-model="state.notes" placeholder="Observações sobre o cliente" class="w-full" :rows="3" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Criar"
            color="primary"
            variant="solid"
            type="submit"
            :loading="loading"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
