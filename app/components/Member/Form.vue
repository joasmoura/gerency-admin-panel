<script setup lang="ts">

const open = defineModel('open', { type: Boolean, required: true })
const emit = defineEmits(['saved'])
const api = useApi()
const saving = ref(false)
const toast = useToast()
const auth = AuthStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role: 'member'
})

const onSubmit = async () => {
  await api.create('/members', form).then((response) => {
    toast.add({
        color: 'success',
        title: 'Membro adicionado',
        description: response.message || 'O membro foi adicionado com sucesso.'
    })
    emit('saved')
    open.value = false
    resetForm()
  }).catch((e) => {
    toast.add({
        color: 'error',
        title: 'Erro ao adicionar membro',
        description: e.message || 'Ocorreu um erro ao adicionar o membro.'
    })
  })
}

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.password = ''
  form.password_confirmation = ''
  form.role = 'member'
}

defineExpose({
    form
})
</script>

<template>
<USlideover v-model:open="open" :ui="{content: 'w-[600px] max-w-full'}">
    <template #header>
      <div class="flex items-center justify-between w-full">
        Adicionar membro

        <UButton @click="open = false" icon="i-lucide-x" color="neutral" variant="ghost" class="ml-2" />
      </div>
    </template>

    <template #body>
        <UForm @submit.prevent="onSubmit" class="flex flex-col gap-4">
            <UInput v-model="form.name" label="Nome" placeholder="Nome completo" required/>
            <UInput v-model="form.email" label="Email" placeholder="Email" type="email" required/>
            <UInput v-model="form.password" label="Senha" placeholder="Senha" type="password" required/>
            <UInput v-model="form.password_confirmation" label="Confirmar senha" placeholder="Confirmar senha" type="password" required/>

            <USelect
                v-model="form.role"
                :items="[
                    { label: 'Membro', value: 'member' },
                    { label: 'Administrador', value: 'admin' }
                ]"
                
                value-key="value"
                required
            />

            <UButton type="submit" :loading="saving" color="primary" variant="solid" label="Adicionar Membro" block/>
        </UForm>
    </template>
</USlideover>
</template>