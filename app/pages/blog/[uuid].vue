<script setup lang="ts">
import type { BlogPost } from '~/composables/useAdminApi'

const toast = useToast()
const router = useRouter()
const route = useRoute()
const { fetchBlogPost, updateBlogPost, loading } = useAdminApi()

const uuid = computed(() => route.params.uuid as string)
const isLoading = ref(true)
const post = ref<BlogPost | null>(null)

// Load post data
onMounted(async () => {
  await loadPost()
})

const loadPost = async () => {
  try {
    isLoading.value = true
    const response = await fetchBlogPost(uuid.value)
    post.value = response
  } catch (err: any) {
    console.error('Error loading post:', err)
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao carregar post',
      color: 'error',
    })
    router.push('/blog')
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async (formData: any) => {
  try {
    await updateBlogPost(uuid.value, formData)
    toast.add({
      title: 'Sucesso',
      description: 'Post atualizado com sucesso',
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
  <div class="max-w-5xl mx-auto">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <BlogPostForm
      v-else
      :post="post"
      :loading="loading"
      :is-edit-mode="true"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>
