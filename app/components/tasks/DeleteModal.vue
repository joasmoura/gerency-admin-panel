<script setup lang="ts">
import type { Task } from '~/types'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  deleted: []
}>()

const open = defineModel<boolean>('open', { default: false })

const loading = ref(false)
const { deleteTask } = useTasks()

async function handleDelete() {
  loading.value = true
  try {
    await deleteTask(props.task.uuid)
    emit('deleted')
    open.value = false
  } catch (error) {
    // Error handled by composable
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
              <UIcon name="i-lucide-trash-2" class="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Excluir Tarefa</h3>
              <p class="text-sm text-gray-500">Esta ação não pode ser desfeita.</p>
            </div>
          </div>
        </template>

        <p class="text-gray-600 dark:text-gray-300">
          Tem certeza que deseja excluir a tarefa 
          <strong class="text-gray-900 dark:text-gray-100">"{{ task.title }}"</strong>?
        </p>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              variant="ghost"
              @click="open = false"
              :disabled="loading"
            >
              Cancelar
            </UButton>
            <UButton
              color="error"
              :loading="loading"
              @click="handleDelete"
            >
              Excluir
            </UButton>
          </div>
        </template>
      </UCard>
    </template>
  </UModal>
</template>
