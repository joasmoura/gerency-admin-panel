<script setup lang="ts">
import type { BlogPost } from '~/composables/useAdminApi';

const toast = useToast()
const { 
  fetchBlogPosts, 
  createBlogPost, 
  updateBlogPost, 
  deleteBlogPost, 
  loading 
} = useAdminApi()

const posts = ref<BlogPost[]>([])
const meta = ref<any>({})
const showModal = ref(false)
const editingPost = ref<BlogPost | null>(null)
const searchQuery = ref('')
const statusFilter = ref<string>('')

// Form data
const form = ref({
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  featured_image: '',
  category: '',
  tags: [] as string[],
  status: 'draft' as 'draft' | 'published' | 'archived',
  is_featured: false,
  sort_order: 0,
  meta_title: '',
  meta_description: '',
  published_at: '',
})

const tagsInput = ref('')

// Load posts
onMounted(async () => {
  await loadPosts()
})

const loadPosts = async () => {
  try {
    const response = await fetchBlogPosts({
      search: searchQuery.value || undefined,
      status: statusFilter.value || undefined,
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

const resetForm = () => {
  form.value = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    category: '',
    tags: [],
    status: 'draft',
    is_featured: false,
    sort_order: 0,
    meta_title: '',
    meta_description: '',
    published_at: '',
  }
  tagsInput.value = ''
  editingPost.value = null
}

const openCreateModal = () => {
  resetForm()
  showModal.value = true
}

const openEditModal = (post: BlogPost) => {
  editingPost.value = post
  form.value = {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt || '',
    content: post.content || '',
    featured_image: post.featured_image || '',
    category: post.category || '',
    tags: post.tags || [],
    status: post.status,
    is_featured: post.is_featured,
    sort_order: post.sort_order,
    meta_title: post.meta_title || '',
    meta_description: post.meta_description || '',
    published_at: post.published_at ? post.published_at.slice(0, 16) : '',
  }
  tagsInput.value = (post.tags || []).join(', ')
  showModal.value = true
}

const handleSubmit = async () => {
  // Parse tags from input
  form.value.tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  try {
    if (editingPost.value) {
      await updateBlogPost(editingPost.value.uuid, form.value)
      toast.add({
        title: 'Sucesso',
        description: 'Post atualizado com sucesso',
        color: 'success',
      })
    } else {
      await createBlogPost(form.value)
      toast.add({
        title: 'Sucesso',
        description: 'Post criado com sucesso',
        color: 'success',
      })
    }
    showModal.value = false
    await loadPosts()
  } catch (err: any) {
    toast.add({
      title: 'Erro',
      description: err.data?.message || 'Erro ao salvar post',
      color: 'error',
    })
  }
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

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

const statusFormOptions = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

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
        @click="openCreateModal"
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
      <UButton color="primary" @click="openCreateModal">
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
            class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
            <td class="py-3 px-4">
              <div class="flex items-center justify-end gap-1">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  icon="i-lucide-pencil"
                  @click="openEditModal(post)"
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

    <!-- Create/Edit Modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <UCard class="max-w-4xl">
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">
                {{ editingPost ? 'Editar Post' : 'Novo Post' }}
              </h3>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                @click="showModal = false"
              />
            </div>
          </template>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Título" name="title" required class="col-span-2">
                <UInput v-model="form.title" placeholder="Título do post" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Slug" name="slug">
                <UInput v-model="form.slug" placeholder="url-do-post (auto-gerado)" />
              </UFormField>
              <UFormField label="Categoria" name="category">
                <UInput v-model="form.category" placeholder="Ex: Produtividade" />
              </UFormField>
            </div>

            <UFormField label="Resumo" name="excerpt">
              <UTextarea 
                v-model="form.excerpt" 
                placeholder="Breve descrição do post..." 
                :rows="2"
              />
            </UFormField>

            <UFormField label="Conteúdo" name="content">
              <UTextarea 
                v-model="form.content" 
                placeholder="Conteúdo do post (suporta HTML)..." 
                :rows="10"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Imagem Destaque (URL)" name="featured_image">
                <UInput v-model="form.featured_image" placeholder="https://..." />
              </UFormField>
              <UFormField label="Tags" name="tags">
                <UInput v-model="tagsInput" placeholder="tag1, tag2, tag3" />
              </UFormField>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <UFormField label="Status" name="status">
                <USelect 
                  v-model="form.status" 
                  :items="statusFormOptions"
                  value-key="value"
                />
              </UFormField>
              <UFormField label="Ordem" name="sort_order">
                <UInput v-model.number="form.sort_order" type="number" min="0" />
              </UFormField>
              <UFormField label="Data de Publicação" name="published_at">
                <UInput v-model="form.published_at" type="datetime-local" />
              </UFormField>
            </div>

            <!-- SEO Fields -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">SEO</h4>
              <div class="grid grid-cols-1 gap-4">
                <UFormField label="Meta Título" name="meta_title">
                  <UInput v-model="form.meta_title" placeholder="Título para SEO" />
                </UFormField>
                <UFormField label="Meta Descrição" name="meta_description">
                  <UTextarea 
                    v-model="form.meta_description" 
                    placeholder="Descrição para SEO..." 
                    :rows="2"
                  />
                </UFormField>
              </div>
            </div>

            <div class="flex items-center gap-6">
              <UCheckbox v-model="form.is_featured" label="Post em Destaque" />
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton
                color="neutral"
                variant="ghost"
                @click="showModal = false"
              >
                Cancelar
              </UButton>
              <UButton
                type="submit"
                color="primary"
                :loading="loading"
              >
                {{ editingPost ? 'Atualizar' : 'Criar' }}
              </UButton>
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
