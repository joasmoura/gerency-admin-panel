<script setup lang="ts">
const toast = useToast()
const router = useRouter()
const { createBlogPost, loading } = useAdminApi()

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
  locale: 'pt-BR',
  published_at: '',
})

const tagsInput = ref('')

const handleSubmit = async () => {
  // Parse tags from input
  form.value.tags = tagsInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0)

  try {
    await createBlogPost(form.value)
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

const statusFormOptions = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Publicado', value: 'published' },
  { label: 'Arquivado', value: 'archived' },
]

const localeOptions = [
  { label: 'Português (Brasil)', value: 'pt-BR' },
  { label: 'English', value: 'en' },
  { label: 'Español', value: 'es' },
]
</script>

<template>
  <div class="max-w-5xl mx-auto">
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
            Novo Post
          </h1>
          <p class="text-gray-500 dark:text-gray-400">
            Crie um novo post para o blog
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
          Criar Post
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
              <UInput v-model="form.slug" placeholder="url-do-post (auto-gerado)" class="w-full"/>
            </UFormField>
            <UFormField label="Categoria" name="category">
              <UInput v-model="form.category" placeholder="Ex: Produtividade" class="w-full"/>
            </UFormField>
          </div>

          <UFormField label="Resumo" name="excerpt">
            <UTextarea 
              v-model="form.excerpt" 
              placeholder="Breve descrição do post..." 
              :rows="3"
              class="w-full"
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
              <UInput v-model="form.featured_image" placeholder="https://..." class="w-full"/>
            </UFormField>
            <UFormField label="Tags" name="tags">
              <UInput v-model="tagsInput" placeholder="tag1, tag2, tag3" class="w-full"/>
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
          <div class="grid grid-cols-4 gap-4">
            <UFormField label="Status" name="status">
              <USelect 
                v-model="form.status" 
                :items="statusFormOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Idioma" name="locale">
              <USelect 
                v-model="form.locale" 
                :items="localeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Ordem" name="sort_order">
              <UInput v-model.number="form.sort_order" type="number" min="0" class="w-full" />
            </UFormField>
            <UFormField label="Data de Publicação" name="published_at">
              <UInput v-model="form.published_at" type="datetime-local" class="w-full" />
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
            <UInput v-model="form.meta_title" placeholder="Título para SEO (deixe vazio para usar o título)" class="w-full"/>
          </UFormField>
          <UFormField label="Meta Descrição" name="meta_description">
            <UTextarea 
              v-model="form.meta_description" 
              placeholder="Descrição para SEO..." 
              :rows="3"
              class="w-full"
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
          Criar Post
        </UButton>
      </div>
    </form>
  </div>
</template>
