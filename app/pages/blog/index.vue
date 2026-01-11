<script setup lang="ts">
import type { BlogPost } from '~/composables/useAdminApi';

const toast = useToast()
const router = useRouter()
const { 
  fetchBlogPosts, 
  updateBlogPost, 
  deleteBlogPost, 
  loading 
} = useAdminApi()

const posts = ref<BlogPost[]>([])
const meta = ref<any>({})
const searchQuery = ref('')
const statusFilter = ref<string | null>(null)
const localeFilter = ref<string | null>(null)

// Load posts
onMounted(async () => {
  await loadPosts()
})

const loadPosts = async () => {
  try {
    const response = await fetchBlogPosts({
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
      locale: localeFilter.value || undefined,
      per_page: 50,
    })
    posts.value = response.data
    meta.value = response.meta
  } catch (err) {
    console.error('Error loading posts:', err)
    toast.add({
      title: 'Erro',
      description: 'Erro ao carregar posts',
      color: 'error',
    })
  }
}

const openCreatePage = () => {
  router.push('/blog/new')
}

const openEditPage = (post: BlogPost) => {
  router.push(`/blog/${post.uuid}`)
}

const handleDelete = async (post: BlogPost) => {
  if (!confirm(`Deseja realmente excluir o post "${post.title}"?`)) return
  
  try {
    await deleteBlogPost(post.uuid)
    toast.add({
      title: 'Sucesso',
      description: 'Post excluído com sucesso',
      color: 'success',
    })
    await loadPosts()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao excluir post',
      color: 'error',
    })
  }
}

const handleToggleFeatured = async (post: BlogPost) => {
  try {
    await updateBlogPost(post.uuid, {
      is_featured: !post.is_featured,
    })
    toast.add({
      title: 'Sucesso',
      description: `Post ${!post.is_featured ? 'destacado' : 'removido do destaque'} com sucesso`,
      color: 'success',
    })
    await loadPosts()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao atualizar destaque',
      color: 'error',
    })
  }
}

const handlePublish = async (post: BlogPost) => {
  try {
    await updateBlogPost(post.uuid, {
      status: 'published',
    })
    toast.add({
      title: 'Sucesso',
      description: 'Post publicado com sucesso',
      color: 'success',
    })
    await loadPosts()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao publicar post',
      color: 'error',
    })
  }
}

const handleUnpublish = async (post: BlogPost) => {
  try {
    await updateBlogPost(post.uuid, {
      status: 'draft',
    })
    toast.add({
      title: 'Sucesso',
      description: 'Post despublicado com sucesso',
      color: 'success',
    })
    await loadPosts()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao despublicar post',
      color: 'error',
    })
  }
}

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout>
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadPosts()
  }, 300)
})

watch(statusFilter, () => {
  loadPosts()
})

watch(localeFilter, () => {
  loadPosts()
})

const statusOptions = [
  { label: 'Todos', value: null },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

const localeOptions = [
  { label: 'Todos os idiomas', value: null },
  { label: 'Português (Brasil)', value: 'pt-BR' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]

const getLocaleLabel = (locale: string) => {
  const labels: Record<string, string> = {
    'pt-BR': 'PT-BR',
    'en': 'EN',
    'es': 'ES',
  }
  return labels[locale] || locale
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'published': return 'success'
    case 'draft': return 'warning'
    case 'archived': return 'neutral'
    default: return 'neutral'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'published': return 'Publicado'
    case 'draft': return 'Rascunho'
    case 'archived': return 'Arquivado'
    default: return status
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Blog
        </h1>
        <p class="text-gray-500 dark:text-gray-400">
          Gerencie os posts do blog
        </p>
      </div>
      <UButton
        color="primary"
        icon="i-lucide-plus"
        @click="openCreatePage"
      >
        Novo Post
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex gap-4 mb-6">
      <UInput
        v-model="searchQuery"
        placeholder="Buscar por título..."
        icon="i-lucide-search"
        class="max-w-md"
      />
      <USelect
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        class="w-40"
        placeholder="Status"
      />
      <USelect
        v-model="localeFilter"
        :items="localeOptions"
        value-key="value"
        class="w-48"
        placeholder="Idioma"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <!-- Empty state -->
    <div v-else-if="posts.length === 0" class="text-center py-20">
      <UIcon name="i-lucide-file-text" class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
        Nenhum post encontrado
      </h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">
        Crie seu primeiro post para o blog
      </p>
      <UButton color="primary" @click="openCreatePage">
        Criar Post
      </UButton>
    </div>

    <!-- Posts Table -->
    <div v-else class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Título</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Categoria</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Idioma</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Autor</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Publicado em</th>
            <th class="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Views</th>
            <th class="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="post in posts" 
            :key="post.uuid"
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
            @click="openEditPage(post)"
          >
            <td class="py-3 px-4">
              <div class="flex items-center gap-3">
                <div 
                  v-if="post.featured_image" 
                  class="w-12 h-12 rounded-lg bg-cover bg-center flex-shrink-0"
                  :style="{ backgroundImage: `url(${post.featured_image})` }"
                />
                <div v-else class="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-400 to-violet-400 flex items-center justify-center flex-shrink-0">
                  <UIcon name="i-lucide-file-text" class="w-6 h-6 text-white" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-gray-900 dark:text-white">{{ post.title }}</span>
                    <UBadge v-if="post.is_featured" color="primary" variant="subtle" size="xs">
                      Destaque
                    </UBadge>
                  </div>
                  <span class="text-xs text-gray-500 dark:text-gray-400">/blog/{{ post.slug }}</span>
                </div>
              </div>
            </td>
            <td class="py-3 px-4">
              <span v-if="post.category" class="text-sm text-gray-600 dark:text-gray-300">
                {{ post.category }}
              </span>
              <span v-else class="text-sm text-gray-400">-</span>
            </td>
            <td class="py-3 px-4">
              <UBadge color="info" variant="subtle" size="sm">
                {{ getLocaleLabel(post.locale) }}
              </UBadge>
            </td>
            <td class="py-3 px-4">
              <UBadge :color="getStatusColor(post.status)" variant="subtle" size="sm">
                {{ getStatusLabel(post.status) }}
              </UBadge>
            </td>
            <td class="py-3 px-4">
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ post.author?.name || '-' }}
              </span>
            </td>
            <td class="py-3 px-4">
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ formatDate(post.published_at) }}
              </span>
            </td>
            <td class="py-3 px-4">
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ post.views_count }}
              </span>
            </td>
            <td class="py-3 px-4" @click.stop>
              <div class="flex items-center justify-end gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-pencil"
                  @click="openEditPage(post)"
                />
                <UButton
                  v-if="post.status === 'draft'"
                  color="success"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-send"
                  @click="handlePublish(post)"
                  title="Publicar"
                />
                <UButton
                  v-if="post.status === 'published'"
                  color="warning"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-eye-off"
                  @click="handleUnpublish(post)"
                  title="Despublicar"
                />
                <UButton
                  :color="post.is_featured ? 'neutral' : 'primary'"
                  variant="ghost"
                  size="xs"
                  :icon="post.is_featured ? 'i-lucide-star-off' : 'i-lucide-star'"
                  @click="handleToggleFeatured(post)"
                />
                <UButton
                  color="error"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-trash-2"
                  @click="handleDelete(post)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
