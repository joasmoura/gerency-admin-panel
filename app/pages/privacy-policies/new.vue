<script setup lang="ts">
const toast = useToast()
const router = useRouter()
const { createPrivacyPolicy, loading } = useAdminApi()

const handleSubmit = async (formData: any) => {
  try {
    await createPrivacyPolicy(formData)
    toast.add({
      title: 'Sucesso',
      description: 'Política criada com sucesso',
      color: 'success',
    })
    router.push('/privacy-policies')
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao salvar política',
      color: 'error',
    })
  }
}

const handleCancel = () => {
  router.push('/privacy-policies')
}
</script>

<template>
  <PrivacyPoliciesPrivacyPolicyForm
    :loading="loading"
    :is-edit-mode="false"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
