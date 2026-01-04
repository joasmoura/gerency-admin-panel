<script setup lang="ts">
const props = withDefaults(defineProps<{
  count?: number
  uuids?: string[]
}>(), {
  count: 0,
  uuids: () => []
})

const emit = defineEmits<{
  deleted: []
}>()

const open = ref(false)
const loading = ref(false)
const { deleteProjects } = useProjects()

async function onSubmit() {
  if (props.uuids.length === 0) return

  loading.value = true
  try {
    await deleteProjects(props.uuids)
    emit('deleted')
    open.value = false
  } catch (error) {
    // Erro já tratado pelo composable
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="`Excluir ${count} projeto${count > 1 ? 's' : ''}`"
    description="Tem certeza? Esta ação não pode ser desfeita."
  >
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancelar"
          color="neutral"
          variant="subtle"
          @click="open = false"
        />
        <UButton
          label="Excluir"
          color="error"
          variant="solid"
          :loading="loading"
          @click="onSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
