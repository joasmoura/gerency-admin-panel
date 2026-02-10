<script setup lang="ts">
/**
 * Componente base de formulário de projetos.
 * Reutilizado pelo AddModal e EditModal.
 * 
 * Props:
 * - state: objeto reativo com os dados do formulário (binding direto)
 * - mode: 'create' | 'edit' — controla visibilidade de campos
 * - customerOptions: opções de clientes para o select
 * - memberOptions: opções de membros para o select
 */

export interface ProjectFormState {
  name: string
  description: string
  customer_id: number | null
  responsible_id: number | null
  status: string
  start_date: string | null
  due_date: string | null
  deadline_days: number | null
  budget: number | null
  hourly_rate: number | null
  estimated_hours: number | null
  progress: number
  notes: string
}

export interface SelectOption {
  label: string
  value: number | string
}

const props = withDefaults(defineProps<{
  state: ProjectFormState
  mode?: 'create' | 'edit'
  customerOptions?: SelectOption[]
  memberOptions?: SelectOption[]
}>(), {
  mode: 'create',
  customerOptions: () => [],
  memberOptions: () => [],
})

const isEdit = computed(() => props.mode === 'edit')

const statusOptions = [
  { label: 'Planejamento', value: 'planning' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Em Espera', value: 'on_hold' },
  { label: 'Concluído', value: 'completed' },
  { label: 'Cancelado', value: 'cancelled' }
]
</script>

<template>
  <div class="space-y-4">
    <UFormField label="Nome do Projeto" name="name" required>
      <UInput v-model="state.name" placeholder="Nome do projeto" class="w-full" />
    </UFormField>

    <UFormField label="Descrição" name="description">
      <UTextarea v-model="state.description" placeholder="Descrição do projeto" class="w-full" :rows="3" />
    </UFormField>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Cliente" name="customer_id">
        <USelectMenu
          v-model="state.customer_id"
          :items="customerOptions"
          placeholder="Selecione um cliente"
          class="w-full"
          value-key="value"
          :search-input="{ placeholder: 'Buscar cliente...' }"
        />
      </UFormField>
      <UFormField label="Status" name="status">
        <USelect v-model="state.status" :items="statusOptions" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Responsável" name="responsible_id">
        <USelectMenu
          v-model="state.responsible_id"
          :items="memberOptions"
          placeholder="Selecione um responsável"
          class="w-full"
          value-key="value"
          :search-input="{ placeholder: 'Buscar responsável...' }"
        />
      </UFormField>
      <UFormField label="Prazo (dias)" name="deadline_days">
        <UInput v-model.number="state.deadline_days" type="number" placeholder="0" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Data de Início" name="start_date">
        <UInput v-model="state.start_date" type="date" class="w-full" />
      </UFormField>
      <UFormField label="Data de Entrega" name="due_date">
        <UInput v-model="state.due_date" type="date" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Orçamento (R$)" name="budget">
        <UInput v-model.number="state.budget" type="number" step="0.01" placeholder="0.00" class="w-full" />
      </UFormField>
      <UFormField label="Valor/Hora (R$)" name="hourly_rate">
        <UInput v-model.number="state.hourly_rate" type="number" step="0.01" placeholder="0.00" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <UFormField label="Horas Estimadas" name="estimated_hours">
        <UInput v-model.number="state.estimated_hours" type="number" step="0.5" placeholder="0" class="w-full" />
      </UFormField>

      <!-- Progresso só aparece na edição (projeto novo sempre começa em 0%) -->
      <UFormField v-if="isEdit" label="Progresso (%)" name="progress">
        <UInput v-model.number="state.progress" type="number" min="0" max="100" placeholder="0" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Observações" name="notes">
      <UTextarea v-model="state.notes" placeholder="Observações sobre o projeto" class="w-full" :rows="3" />
    </UFormField>
  </div>
</template>
