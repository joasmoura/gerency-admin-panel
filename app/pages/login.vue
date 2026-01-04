<script setup lang="ts">
import { useAdminAuthStore } from '~/stores/adminAuthStore';

definePageMeta({
  layout: 'generic',
  middleware: [],
});

const router = useRouter()
const toast = useToast()
const adminStore = useAdminAuthStore()
const { login, loading, error } = useAdminApi()

const form = ref({
  email: '',
  password: '',
})

const isSubmitting = ref(false)

// Redireciona se já estiver logado (verificado pelo middleware)
if (adminStore.isLoggedIn) {
  router.push('/')
}

const handleSubmit = async () => {
  if (!form.value.email || !form.value.password) {
    toast.add({
      title: 'Erro',
      description: 'Preencha todos os campos',
      color: 'error',
    })
    return
  }

  isSubmitting.value = true

  try {
    await login(form.value.email, form.value.password)
    toast.add({
      title: 'Sucesso',
      description: 'Login realizado com sucesso',
      color: 'success',
    })
    router.push('/')
  } catch (err: any) {
    const message = err.data?.message || 'Erro ao fazer login'
    toast.add({
      title: 'Erro de autenticação',
      description: message,
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-900 px-4">
    <div class="max-w-md w-full">
      <UCard class="bg-gray-800 border-gray-700">
        <div class="text-center mb-8">
          <div class="mx-auto w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mb-4">
            <UIcon name="i-lucide-shield-check" class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-white">
            Admin Login
          </h1>
          <p class="text-gray-400 mt-2">
            Área restrita para administradores do sistema
          </p>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <UFormField label="Email" name="email">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="admin@exemplo.com"
              icon="i-lucide-mail"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Senha" name="password">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              icon="i-lucide-lock"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            color="primary"
            size="lg"
            block
            :loading="isSubmitting"
          >
            Entrar
          </UButton>
        </form>

        <div class="mt-6 text-center">
          <NuxtLink to="/" class="text-sm text-gray-400 hover:text-primary-400">
            ← Voltar ao sistema
          </NuxtLink>
        </div>
      </UCard>
    </div>
  </div>
</template>
