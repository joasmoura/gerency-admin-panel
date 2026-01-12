<script setup lang="ts">
const toast = useToast()
const router = useRouter()
const { createBlogPost, loading } = useAdminApi()

const handleSubmit = async (formData: any) => {
  try {
    await createBlogPost(formData)
    toast.add({
      title: 'Sucesso',
      description: 'Post criado com sucesso',
      color: 'success',
    })
    router.push('/blog')
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao salvar post',
      color: 'error',
    })
  }
}

const handleCancel = () => {
  router.push('/blog')
}
</script>

<template>
  <BlogPostForm
    :loading="loading"
    :is-edit-mode="false"
    @submit="handleSubmit"
    @cancel="handleCancel"
  />
</template>
