<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Task } from '~/types'

const props = defineProps<{
  task?: Task | null
}>()

const emit = defineEmits<{
  saved: [task: Task]
}>()

const open = defineModel<boolean>('open', { default: false })

// Computed para verificar se é edição ou criação
const isEditing = computed(() => !!props.task)

const schema = z.object({
  title: z.string().min(2, 'Título muito curto'),
  description: z.string().optional().nullable(),
  project_id: z.number().optional(),
  milestone_id: z.number().optional(),
  status_id: z.number().optional(),
  priority_id: z.number().optional(),
  type_id: z.number().optional(),
  responsible_id: z.number().optional(),
  due_date: z.string().optional().nullable(),
  estimated_hours: z.number().min(0).optional(),
  estimated_minutes: z.number().min(0).max(59).optional(),
  value: z.number().min(0).optional(),
  is_blocked: z.boolean().optional(),
  block_reason: z.string().optional().nullable()
})

type Schema = z.output<typeof schema>

const loading = ref(false)
const { createTask, updateTask } = useTasks()
const { taskStatuses, fetchAllTaskStatuses } = useTaskStatuses()
const { taskPriorities, fetchAllTaskPriorities } = useTaskPriorities()
const { taskTypes, fetchAllTaskTypes } = useTaskTypes()
const { projects } = useProjects()
const { fetchMilestonesByProject } = useMilestones()

// Members
const api = useApi()
const members = ref<any[]>([])
const projectMilestones = ref<any[]>([])

// Estado inicial padrão
const defaultState: Partial<Schema> = {
  title: '',
  description: '',
  project_id: undefined,
  milestone_id: undefined,
  status_id: undefined,
  priority_id: undefined,
  type_id: undefined,
  responsible_id: undefined,
  due_date: undefined,
  estimated_hours: 0,
  estimated_minutes: 0,
  value: 0,
  is_blocked: false,
  block_reason: ''
}

const state = reactive<Partial<Schema>>({ ...defaultState })

// Watch for project change to load milestones
watch(() => state.project_id, async (newProjectId, oldProjectId) => {
  if (newProjectId) {
    projectMilestones.value = await fetchMilestonesByProject(newProjectId)
  } else {
    projectMilestones.value = []
  }
  // Reset milestone only if project changed (not on initial load)
  if (oldProjectId !== undefined && newProjectId !== oldProjectId) {
    state.milestone_id = undefined
  }
})

// Load data when modal opens
watch(open, async (isOpen) => {
  if (isOpen) {
    await Promise.all([
      fetchAllTaskStatuses(),
      fetchAllTaskPriorities(),
      fetchAllTaskTypes(),
      loadMembers()
    ])
    
    if (props.task) {
      // Modo edição: carregar dados da tarefa
      state.title = props.task.title
      state.description = props.task.description || ''
      state.project_id = props.task.project_id || undefined
      state.milestone_id = props.task.milestone_id || undefined
      state.status_id = props.task.status_id || undefined
      state.priority_id = props.task.priority_id || undefined
      state.type_id = props.task.type_id || undefined
      state.responsible_id = props.task.responsible_id || undefined
      state.due_date = props.task.due_date || undefined
      state.estimated_hours = props.task.estimated_hours || 0
      state.estimated_minutes = props.task.estimated_minutes || 0
      state.value = props.task.value || 0
      state.is_blocked = props.task.is_blocked || false
      state.block_reason = props.task.block_reason || ''
      
      // Load milestones if project is set
      if (props.task.project_id) {
        projectMilestones.value = await fetchMilestonesByProject(props.task.project_id)
      }
    } else {
      // Modo criação: resetar para valores padrão
      resetForm()
      
      // Set default status and priority
      const defaultStatus = taskStatuses.value.find(s => s.is_default)
      const defaultPriority = taskPriorities.value.find(p => p.is_default)
      
      if (defaultStatus) state.status_id = defaultStatus.id
      if (defaultPriority) state.priority_id = defaultPriority.id
    }
  }
}, { immediate: true })

async function loadMembers() {
  try {
    const response = await api.request('/members?all=1', 'GET') as any
    members.value = response || []
  } catch (error) {
    console.error('Erro ao carregar membros:', error)
  }
}

// Options for selects
const projectOptions = computed(() => 
  projects.value.map(p => ({ label: p.name, value: p.id }))
)

const milestoneOptions = computed(() => 
  projectMilestones.value.map(m => ({ label: m.name, value: m.id }))
)

const statusOptions = computed(() => 
  taskStatuses.value.map(s => ({ 
    label: s.name, 
    value: s.id,
    color: s.color 
  }))
)

const priorityOptions = computed(() => 
  taskPriorities.value.map(p => ({ 
    label: p.name, 
    value: p.id,
    color: p.color 
  }))
)

const typeOptions = computed(() => 
  taskTypes.value.map(t => ({ 
    label: t.name, 
    value: t.id,
    color: t.color,
    icon: t.icon 
  }))
)

const memberOptions = computed(() => 
  members.value.map(m => ({ 
    label: m.name, 
    value: m.id,
    avatar: m.avatar 
  }))
)

function resetForm() {
  Object.assign(state, { ...defaultState })
  projectMilestones.value = []
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    let response: any
    
    if (isEditing.value && props.task) {
      response = await updateTask(props.task.uuid, event.data as any)
    } else {
      response = await createTask(event.data as any)
    }
    
    emit('saved', response?.data || response)
    open.value = false
    resetForm()
  } catch (error) {
    // Error handled by composable
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    class="max-h-[calc(100dvh-2rem)] overflow-hidden sm:max-w-4xl"
  >
    <template #content>
      <div class="flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <UIcon 
                :name="isEditing ? 'i-lucide-pencil' : 'i-lucide-plus'" 
                class="w-5 h-5 text-primary-600 dark:text-primary-400" 
              />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {{ isEditing ? 'Editar Tarefa' : 'Nova Tarefa' }}
                </h3>
                <UBadge v-if="isEditing && task" variant="subtle" color="neutral">
                  #{{ task.code }}
                </UBadge>
              </div>
              <p class="text-sm text-gray-500">
                {{ isEditing ? 'Atualize os dados da tarefa' : 'Preencha os dados da tarefa' }}
              </p>
              <div v-if="isEditing && task?.creator" class="flex items-center gap-2 mt-1 text-xs text-gray-400">
                <UAvatar :alt="task.creator.name" size="2xs" />
                <span>Criado por <strong>{{ task.creator.name }}</strong></span>
              </div>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            size="sm"
            @click="open = false"
          />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto p-4">
          <UForm
            :schema="schema"
            :state="state"
            @submit="onSubmit"
            class="space-y-5"
          >
            <!-- Title - Full Width -->
            <UFormField label="Título" name="title" required class="w-full">
              <UInput
                v-model="state.title"
                placeholder="Digite o título da tarefa"
                size="lg"
                autofocus
                class="w-full"
              />
            </UFormField>

            <!-- Description - Full Width below title -->
            <UFormField label="Descrição" name="description" class="w-full">
              <RichTextEditor
                :model-value="state.description ?? ''"
                @update:model-value="state.description = $event"
                placeholder="Adicione uma descrição detalhada para a tarefa..."
                toolbar="full"
                height="150px"
                :enable-mentions="true"
                :members="members"
              />
            </UFormField>

            <!-- Fields Grid -->
            <div class="space-y-4">
              <!-- Project & Milestone -->
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Projeto" name="project_id" class="w-full">
                  <USelectMenu
                    v-model="state.project_id"
                    :items="projectOptions"
                    placeholder="Selecione um projeto"
                    value-key="value"
                    searchable
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Marco" name="milestone_id" class="w-full">
                  <USelectMenu
                    v-model="state.milestone_id"
                    :items="milestoneOptions"
                    placeholder="Selecione um marco"
                    value-key="value"
                    :disabled="!state.project_id"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <!-- Status, Type, Priority, Responsible -->
              <div class="grid grid-cols-4 gap-4">
                <UFormField label="Status" name="status_id" class="w-full">
                  <USelectMenu
                    v-model="state.status_id"
                    :items="statusOptions"
                    placeholder="Selecione"
                    value-key="value"
                    class="w-full"
                  >
                    <template #item="{ item }">
                      <span
                        class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                        :style="{ backgroundColor: item.color }"
                      ></span>
                      <span class="truncate">{{ item.label }}</span>
                    </template>
                  </USelectMenu>
                </UFormField>

                <UFormField label="Tipo" name="type_id" class="w-full">
                  <USelectMenu
                    v-model="state.type_id"
                    :items="typeOptions"
                    placeholder="Selecione"
                    value-key="value"
                    class="w-full"
                  >
                    <template #item="{ item }">
                      <span
                        class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                        :style="{ backgroundColor: item.color }"
                      ></span>
                      <span class="truncate">{{ item.label }}</span>
                    </template>
                  </USelectMenu>
                </UFormField>

                <UFormField label="Prioridade" name="priority_id" class="w-full">
                  <USelectMenu
                    v-model="state.priority_id"
                    :items="priorityOptions"
                    placeholder="Selecione"
                    value-key="value"
                    class="w-full"
                  >
                    <template #item="{ item }">
                      <span
                        class="w-2.5 h-2.5 rounded-full mr-2 flex-shrink-0"
                        :style="{ backgroundColor: item.color }"
                      ></span>
                      <span class="truncate">{{ item.label }}</span>
                    </template>
                  </USelectMenu>
                </UFormField>

                <UFormField label="Responsável" name="responsible_id" class="w-full">
                  <USelectMenu
                    v-model="state.responsible_id"
                    :items="memberOptions"
                    placeholder="Selecione"
                    value-key="value"
                    searchable
                    class="w-full"
                  >
                    <template #item="{ item }">
                      <UAvatar :alt="item.label" :src="item.avatar" size="2xs" class="mr-2" />
                      {{ item.label }}
                    </template>
                  </USelectMenu>
                </UFormField>
              </div>

              <!-- Due Date, Estimated Time & Value -->
              <div class="grid grid-cols-4 gap-4">
                <UFormField label="Vencimento" name="due_date" class="w-full">
                  <UInput
                    v-model="state.due_date"
                    type="date"
                    class="w-full"
                  />
                </UFormField>

                <UFormField label="Horas Est." name="estimated_hours" class="w-full">
                  <UInput
                    v-model.number="state.estimated_hours"
                    type="number"
                    :min="0"
                    placeholder="0"
                    class="w-full"
                  >
                    <template #trailing>
                      <span class="text-gray-400 text-xs">h</span>
                    </template>
                  </UInput>
                </UFormField>

                <UFormField label="Minutos" name="estimated_minutes" class="w-full">
                  <UInput
                    v-model.number="state.estimated_minutes"
                    type="number"
                    :min="0"
                    :max="59"
                    placeholder="0"
                    class="w-full"
                  >
                    <template #trailing>
                      <span class="text-gray-400 text-xs">min</span>
                    </template>
                  </UInput>
                </UFormField>

                <UFormField label="Valor (R$)" name="value" class="w-full">
                  <UInput
                    v-model.number="state.value"
                    type="number"
                    :min="0"
                    step="0.01"
                    placeholder="0,00"
                    class="w-full"
                  />
                </UFormField>
              </div>

              <!-- Blocked Toggle -->
              <div class="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <USwitch v-model="state.is_blocked" />
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-alert-triangle" class="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
                  <span class="text-sm font-medium text-yellow-800 dark:text-yellow-400">Impedimento</span>
                </div>
              </div>

              <!-- Block Reason -->
              <UFormField
                v-if="state.is_blocked"
                label="Motivo do Impedimento"
                name="block_reason"
                class="w-full"
              >
                <UTextarea
                  v-model="state.block_reason"
                  placeholder="Descreva o motivo..."
                  :rows="2"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Footer Actions -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <UButton
                variant="ghost"
                @click="open = false"
              >
                Cancelar
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :icon="isEditing ? 'i-lucide-save' : 'i-lucide-check'"
                :loading="loading"
              >
                {{ isEditing ? 'Salvar Alterações' : 'Criar Tarefa' }}
              </UButton>
            </div>
          </UForm>
        </div>
      </div>
    </template>
  </UModal>
</template>
