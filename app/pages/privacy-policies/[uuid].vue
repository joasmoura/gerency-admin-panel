<script setup lang="ts">
import type { PrivacyPolicy } from '~/composables/useAdminApi'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { fetchPrivacyPolicy, updatePrivacyPolicy, loading } = useAdminApi()

const policy = ref<PrivacyPolicy | null>(null)
const loadingPolicy = ref(true)

onMounted(async () => {
  try {
    policy.value = await fetchPrivacyPolicy(route.params.uuid as string)
  } catch (err) {
    console.error('Error loading policy:', err)
    toast.add({
      title: 'Erro',
      description: 'Política não encontrada',
      color: 'error',
    })
    router.push('/privacy-policies')
  } finally {
    loadingPolicy.value = false
  }
})

const handleSubmit = async (formData: any) => {
  try {
    await updatePrivacyPolicy(route.params.uuid as string, formData)
    toast.add({
      title: 'Sucesso',
      description: 'Política atualizada com sucesso',
      color: 'success',
    })
    router.push('/privacy-policies')
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao atualizar política',
      color: 'error',
    })
  }
}

const handleCancel = () => {
  router.push('/privacy-policies')
}
</script>

<template>
  <div v-if="loadingPolicy" class="flex items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
  </div>
  
  <PrivacyPoliciesPrivacyPolicyForm
    v-else
    :policy="policy"
    :loading="loading"
    :is-edit-mode="true"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
