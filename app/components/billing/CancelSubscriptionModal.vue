<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean;
  loading?: boolean;
  planName?: string;
  billingPeriodEnd?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', reason: string): void;
  (e: 'cancel'): void;
}>();

const selectedReason = ref('');
const otherReason = ref('');

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const cancellationReasons = [
  { value: 'too_expensive', label: 'O preço está muito alto' },
  { value: 'not_using', label: 'Não estou usando o suficiente' },
  { value: 'missing_features', label: 'Faltam recursos que preciso' },
  { value: 'found_alternative', label: 'Encontrei uma alternativa melhor' },
  { value: 'technical_issues', label: 'Problemas técnicos frequentes' },
  { value: 'temporary', label: 'Pausa temporária' },
  { value: 'other', label: 'Outro motivo' },
];

const formattedEndDate = computed(() => {
  if (!props.billingPeriodEnd) return '';
  return new Date(props.billingPeriodEnd).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
});

const canSubmit = computed(() => {
  if (!selectedReason.value) return false;
  if (selectedReason.value === 'other' && !otherReason.value.trim()) return false;
  return true;
});

const handleConfirm = () => {
  const reason = selectedReason.value === 'other' 
    ? otherReason.value.trim() 
    : selectedReason.value;
  emit('confirm', reason);
};

const handleClose = () => {
  selectedReason.value = '';
  otherReason.value = '';
  emit('cancel');
  isOpen.value = false;
};

// Reset form when modal opens
watch(isOpen, (open) => {
  if (open) {
    selectedReason.value = '';
    otherReason.value = '';
  }
});
</script>

<template>
  <UModal v-model="isOpen" @close="handleClose">
    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Cancelar Assinatura
            </h3>
            <p v-if="planName" class="text-sm text-gray-500 dark:text-gray-400">
              Plano {{ planName }}
            </p>
          </div>
        </div>
      </template>

      <div class="space-y-6">
        <!-- Warning Message -->
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div class="flex gap-3">
            <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-yellow-700 dark:text-yellow-300">
              <p class="font-medium">O que acontece ao cancelar:</p>
              <ul class="mt-2 space-y-1 list-disc list-inside">
                <li>Você manterá acesso até <strong>{{ formattedEndDate || 'o fim do período' }}</strong></li>
                <li>Após essa data, você perderá acesso aos recursos do plano</li>
                <li>Seus dados serão mantidos por 30 dias</li>
                <li>Você pode reativar a assinatura a qualquer momento</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Cancellation Reason -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Por que você está cancelando? <span class="text-red-500">*</span>
          </label>
          <div class="space-y-2">
            <div
              v-for="reason in cancellationReasons"
              :key="reason.value"
              class="flex items-center"
            >
              <input
                :id="`reason-${reason.value}`"
                v-model="selectedReason"
                type="radio"
                :value="reason.value"
                class="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <label
                :for="`reason-${reason.value}`"
                class="ml-3 text-sm text-gray-700 dark:text-gray-300"
              >
                {{ reason.label }}
              </label>
            </div>
          </div>

          <!-- Other reason textarea -->
          <div v-if="selectedReason === 'other'" class="mt-3">
            <UTextarea
              v-model="otherReason"
              placeholder="Descreva o motivo do cancelamento..."
              :rows="3"
              class="w-full"
            />
          </div>
        </div>

        <!-- Offer to keep -->
        <div class="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
          <div class="flex items-start gap-3">
            <UIcon name="i-heroicons-gift" class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
            <div>
              <p class="text-sm font-medium text-primary-700 dark:text-primary-300">
                Quer conversar antes de cancelar?
              </p>
              <p class="mt-1 text-sm text-primary-600 dark:text-primary-400">
                Nossa equipe pode ajudar a encontrar uma solução que funcione para você.
                <UButton
                  color="primary"
                  variant="link"
                  size="xs"
                  class="ml-1"
                  @click="handleClose"
                >
                  Falar com suporte
                </UButton>
              </p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="outline"
            @click="handleClose"
          >
            Manter Assinatura
          </UButton>
          <UButton
            color="error"
            :loading="loading"
            :disabled="!canSubmit"
            @click="handleConfirm"
          >
            Confirmar Cancelamento
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
