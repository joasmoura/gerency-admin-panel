<script setup lang="ts">
import type { Sprint } from '~/types'

const props = defineProps<{
  sprint?: Sprint | null
}>()

const emit = defineEmits<{
  saved: [sprint: Sprint]
  close: []
}>()

const open = defineModel<boolean>('open', { default: false })

const { createSprint, updateSprint, statusOptions } = useSprints()

// Form state
const form = reactive({
  name: '',
  description: '',
  goal: '',
  start_date: null as string | null,
  end_date: null as string | null,
  status: 'planning' as string,
  is_active: true
})

const saving = ref(false)
const errors = ref<Record<string, string>>({})

// Populate form from sprint
function populateForm(sprint: Sprint | null | undefined) {
  if (sprint) {
    form.name = sprint.name || ''
    form.description = sprint.description || ''
    form.goal = sprint.goal || ''
    form.start_date = sprint.start_date ? sprint.start_date.split('T')[0] : null
    form.end_date = sprint.end_date ? sprint.end_date.split('T')[0] : null
    form.status = sprint.status || 'planning'
    form.is_active = sprint.is_active ?? true
  } else {
    resetForm()
  }
}

// Watch for sprint changes to populate form
watch(() => props.sprint, (newSprint) => {
  populateForm(newSprint)
}, { immediate: true })

// Watch for modal open to ensure form is populated
watch(open, (isOpen) => {
  if (isOpen) {
    populateForm(props.sprint)
  }
})

// Reset form
function resetForm() {
  form.name = ''
  form.description = ''
  form.goal = ''
  form.start_date = null
  form.end_date = null
  form.status = 'planning'
  form.is_active = true
  errors.value = {}
}

// Status options for select
const statusSelectOptions = computed(() => 
  statusOptions.map(s => ({ 
    label: s.label, 
    value: s.value,
    icon: s.icon
  }))
)

// Validate form
function validate(): boolean {
  errors.value = {}
  
  if (!form.name.trim()) {
    errors.value.name = 'O nome é obrigatório'
  }
  
  if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
    errors.value.end_date = 'A data de término deve ser posterior à data de início'
  }
  
  return Object.keys(errors.value).length === 0
}

// Save sprint
async function handleSubmit() {
  if (!validate()) return
  
  saving.value = true
  try {
    const data: Partial<Sprint> = {
      name: form.name,
      description: form.description || undefined,
      goal: form.goal || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      status: form.status as Sprint['status'],
      is_active: form.is_active
    }
    
    let sprint: Sprint
    if (props.sprint?.uuid) {
      sprint = await updateSprint(props.sprint.uuid, data)
    } else {
      sprint = await createSprint(data)
    }
    
    emit('saved', sprint)
    open.value = false
    resetForm()
  } catch (error: any) {
    if (error.response?.data?.errors) {
      errors.value = error.response.data.errors
    }
  } finally {
    saving.value = false
  }
}

// Close modal
function handleClose() {
  open.value = false
  resetForm()
  emit('close')
}
</script>

<template>
  <UModal
    v-model:open="open"
    class="sm:max-w-xl"
    @close="handleClose"
  >
    <template #header>
      <h3 class="text-lg font-semibold">{{ sprint ? 'Editar Sprint' : 'Nova Sprint' }}</h3>
    </template>
    <template #body>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <!-- Nome -->
        <UFormField label="Nome" required :error="errors.name">
          <UInput
            v-model="form.name"
            placeholder="Nome da sprint"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <!-- Goal -->
        <UFormField label="Objetivo da Sprint">
          <UTextarea
            v-model="form.goal"
            placeholder="Qual é o objetivo desta sprint?"
            :rows="2"
            class="w-full"
          />
        </UFormField>

        <!-- Description -->
        <UFormField label="Descrição">
          <UTextarea
            v-model="form.description"
            placeholder="Descrição detalhada da sprint"
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <!-- Dates -->
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Data de Início">
            <UInput
              v-model="form.start_date"
              type="date"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Data de Término" :error="errors.end_date">
            <UInput
              v-model="form.end_date"
              type="date"
              class="w-full"
            />
          </UFormField>
        </div>

        <!-- Status (only when editing) -->
        <UFormField v-if="sprint" label="Status">
          <USelectMenu
            v-model="form.status"
            :items="statusSelectOptions"
            value-key="value"
            class="w-full"
          >
            <template #item="{ item }">
              <div class="flex items-center gap-2">
                <UIcon :name="item.icon" class="w-4 h-4" />
                <span>{{ item.label }}</span>
              </div>
            </template>
          </USelectMenu>
        </UFormField>

        <!-- Active -->
        <div class="flex items-center gap-2">
          <UCheckbox v-model="form.is_active" />
          <span class="text-sm text-gray-700 dark:text-gray-300">Sprint ativa</span>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          color="neutral"
          variant="ghost"
          @click="handleClose"
        >
          Cancelar
        </UButton>
        <UButton
          color="primary"
          :loading="saving"
          @click="handleSubmit"
        >
          {{ sprint ? 'Salvar' : 'Criar Sprint' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
