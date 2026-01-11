<script setup lang="ts">
import type { BlogPost } from '~/composables/useAdminApi';

const toast = useToast()
const router = useRouter()
const route = useRoute()
const { fetchBlogPost, updateBlogPost, loading } = useAdminApi()

const uuid = computed(() => route.params.uuid as string)

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
    
    // Populate form
    form.value = {
      title: response.title,
      slug: response.slug,
      excerpt: response.excerpt || '',
      content: response.content || '',
      featured_image: response.featured_image || '',
      category: response.category || '',
      tags: response.tags || [],
      status: response.status,
      is_featured: response.is_featured,
      sort_order: response.sort_order,
      meta_title: response.meta_title || '',
      meta_description: response.meta_description || '',
      published_at: response.published_at ? response.published_at.slice(0, 16) : '',
    }
    tagsInput.value = (response.tags || []).join(', ')
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

const handleSubmit = async () => {
  // Parse tags from input
  form.value.tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  try {
    await updateBlogPost(uuid.value, form.value)
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

const statusFormOptions = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-4">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-left"
            @click="handleCancel"
          />
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Editar Post
            </h1>
            <p class="text-gray-500 dark:text-gray-400">
              {{ post?.title }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="handleCancel"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-save"
            :loading="loading"
            @click="handleSubmit"
          >
            Salvar Alterações
          </UButton>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Informações Básicas</h3>
          </template>

          <div class="space-y-4">
            <UFormField label="Título" name="title" required>
              <UInput v-model="form.title" placeholder="Título do post" class="w-full" />
            </UFormField>

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
                :rows="3"
              />
            </UFormField>

            <UFormField label="Conteúdo" name="content">
              <RichTextEditor 
                v-model="form.content" 
                placeholder="Escreva o conteúdo do post..."
                height="400px"
                toolbar="full"
                :enable-images="true"
              />
            </UFormField>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Mídia e Categorização</h3>
          </template>

          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Imagem Destaque (URL)" name="featured_image">
                <UInput v-model="form.featured_image" placeholder="https://..." />
              </UFormField>
              <UFormField label="Tags" name="tags">
                <UInput v-model="tagsInput" placeholder="tag1, tag2, tag3" />
              </UFormField>
            </div>

            <!-- Preview da imagem -->
            <div v-if="form.featured_image" class="mt-2">
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
              <img 
                :src="form.featured_image" 
                alt="Preview" 
                class="max-w-xs h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Configurações de Publicação</h3>
          </template>

          <div class="space-y-4">
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

            <div class="flex items-center gap-6 pt-2">
              <UCheckbox v-model="form.is_featured" label="Post em Destaque" />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">SEO</h3>
          </template>

          <div class="space-y-4">
            <UFormField label="Meta Título" name="meta_title">
              <UInput v-model="form.meta_title" placeholder="Título para SEO (deixe vazio para usar o título)" />
            </UFormField>
            <UFormField label="Meta Descrição" name="meta_description">
              <UTextarea 
                v-model="form.meta_description" 
                placeholder="Descrição para SEO..." 
                :rows="3"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Action buttons (mobile/bottom) -->
        <div class="flex justify-end gap-2 pb-6">
          <UButton
            color="neutral"
            variant="ghost"
            @click="handleCancel"
          >
            Cancelar
          </UButton>
          <UButton
            type="submit"
            color="primary"
            icon="i-lucide-save"
            :loading="loading"
          >
            Salvar Alterações
          </UButton>
        </div>
      </form>
    </template>
  </div>
</template>
