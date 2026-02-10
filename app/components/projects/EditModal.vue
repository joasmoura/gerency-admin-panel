<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Project } from '~/types'

const props = defineProps<{
  project: Project | null
}>()

const emit = defineEmits<{
  updated: [project: Project]
}>()

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  description: z.string().optional(),
  customer_id: z.number().optional().nullable(),
  responsible_id: z.number().optional().nullable(),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']).default('planning'),
  start_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  deadline_days: z.number().optional().nullable(),
  budget: z.number().optional().nullable(),
  hourly_rate: z.number().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  progress: z.number().min(0).max(100).default(0),
  notes: z.string().optional()
})

type Schema = z.output<typeof schema>

const open = defineModel<boolean>('open', { default: false })
const loading = ref(false)
const { updateProject } = useProjects()
const { customers, fetchCustomers } = useCustomers()

// Buscar membros do tenant
const api = useApi()
const members = ref<any[]>([])

const state = reactive<Partial<Schema>>({
  name: '',
  description: '',
  customer_id: null,
  responsible_id: null,
  status: 'planning',
  start_date: null,
  due_date: null,
  deadline_days: null,
  budget: null,
  hourly_rate: null,
  estimated_hours: null,
  progress: 0,
  notes: ''
})

// Carregar dados quando abrir o modal
watch(open, async (isOpen) => {
  if (isOpen) {
    await Promise.all([
      fetchCustomers(1),
      loadMembers()
    ])
  }
})

async function loadMembers() {
  try {
    const response = await api.index('members', 1, { all: true })
    members.value = response?.data || response || []
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
  }
}

// Observar mudanças no project e popular o formulário
watch(() => props.project, (newProject) => {
  if (newProject) {
    state.name = newProject.name || ''
    state.description = newProject.description || ''
    state.customer_id = newProject.customer_id || null
    state.responsible_id = newProject.responsible_id || null
    state.status = newProject.status || 'planning'
    state.start_date = newProject.start_date ? newProject.start_date.split('T')[0] : null
    state.due_date = newProject.due_date ? newProject.due_date.split('T')[0] : null
    state.deadline_days = newProject.deadline_days || null
    state.budget = newProject.budget || null
    state.hourly_rate = newProject.hourly_rate || null
    state.estimated_hours = newProject.estimated_hours || null
    state.progress = newProject.progress || 0
    state.notes = newProject.notes || ''
  }
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.project) return

  loading.value = true
  try {
    const response = await updateProject(props.project.uuid, event.data)
    emit('updated', response.data)
    open.value = false
  } catch (error) {
    // Erro já tratado pelo composable
  } finally {
    loading.value = false
  }
}

const customerOptions = computed(() => {
  return customers.value.map(c => ({
    label: c.name,
    value: c.id
  }))
})

const memberOptions = computed(() => {
  return members.value.map((m: any) => ({
    label: m.name,
    value: m.id
  }))
})
</script>

<template>
  <UModal v-model:open="open" title="Editar Projeto" description="Atualize os dados do projeto">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="max-h-[70vh] overflow-y-auto pr-2"
        @submit="onSubmit"
      >
        <ProjectsProjectFormFields
          :state="(state as any)"
          mode="edit"
          :customer-options="customerOptions"
          :member-options="memberOptions"
        />

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancelar"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton
            label="Salvar"
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
