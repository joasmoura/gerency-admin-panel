<script setup lang="ts">
declare global {
  interface Window {
    Stripe?: any;
  }
}

const props = defineProps<{
  modelValue: boolean;
  loading?: boolean;
  clientSecret?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success', paymentMethodId: string): void;
  (e: 'error', error: string): void;
}>();

const { getSetupIntent, addPaymentMethod } = useSubscription();

const cardElementRef = ref<HTMLDivElement>();
const stripe = ref<any>(null);
const cardElement = ref<any>(null);
const cardComplete = ref(false);
const processing = ref(false);
const errorMessage = ref('');

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Initialize Stripe Elements
onMounted(async () => {
  if (typeof window !== 'undefined' && window.Stripe) {
    const config = useRuntimeConfig();
    stripe.value = window.Stripe(config.public.stripePublishableKey);
    
    const elements = stripe.value.elements({
      locale: 'pt-BR',
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#6366f1',
          colorBackground: '#ffffff',
          colorText: '#1f2937',
          colorDanger: '#ef4444',
          fontFamily: 'Inter, system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '8px',
        },
      },
    });
    
    cardElement.value = elements.create('card', {
      style: {
        base: {
          fontSize: '16px',
          color: '#1f2937',
          '::placeholder': {
            color: '#9ca3af',
          },
        },
        invalid: {
          color: '#ef4444',
          iconColor: '#ef4444',
        },
      },
      hidePostalCode: true,
    });
  }
});

// Mount card element when modal opens
watch(isOpen, (open) => {
  if (open && cardElement.value && cardElementRef.value) {
    nextTick(() => {
      cardElement.value.mount(cardElementRef.value);
      cardElement.value.on('change', (event: any) => {
        cardComplete.value = event.complete;
        errorMessage.value = event.error?.message || '';
      });
    });
  }
});

const handleSubmit = async () => {
  if (!stripe.value || !cardElement.value) return;
  
  processing.value = true;
  errorMessage.value = '';
  
  try {
    // Create setup intent from backend
    const clientSecret = await getSetupIntent();
    
    if (!clientSecret) {
      throw new Error('Não foi possível iniciar o processo de adição do cartão');
    }
    
    // Confirm card setup with Stripe
    const { setupIntent, error } = await stripe.value.confirmCardSetup(
      clientSecret,
      {
        payment_method: {
          card: cardElement.value,
        },
      }
    );
    
    if (error) {
      throw new Error(error.message || 'Erro ao adicionar cartão');
    }
    
    if (setupIntent.status === 'succeeded') {
      // Add payment method to backend
      await addPaymentMethod(setupIntent.payment_method, true);
      emit('success', setupIntent.payment_method);
      isOpen.value = false;
      cardElement.value.clear();
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao adicionar forma de pagamento';
    emit('error', errorMessage.value);
  } finally {
    processing.value = false;
  }
};

const handleClose = () => {
  if (cardElement.value) {
    cardElement.value.clear();
  }
  errorMessage.value = '';
  isOpen.value = false;
};
</script>

<template>
  <UModal v-model="isOpen" @close="handleClose">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Adicionar Forma de Pagamento
          </h3>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark"
            @click="handleClose"
          />
        </div>
      </template>

      <div class="space-y-6">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Adicione um cartão de crédito ou débito para realizar pagamentos.
        </p>

        <!-- Stripe Card Element Container -->
        <div class="space-y-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Dados do Cartão
          </label>
          <div
            ref="cardElementRef"
            class="p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Security Note -->
        <div class="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
          <UIcon name="i-heroicons-lock-closed" class="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Seus dados de pagamento são processados de forma segura pelo Stripe. 
            Não armazenamos os dados completos do seu cartão.
          </span>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="outline"
            @click="handleClose"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            :loading="processing"
            :disabled="!cardComplete || processing"
            @click="handleSubmit"
          >
            Adicionar Cartão
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style>
/* Stripe Elements styles */
.StripeElement {
  width: 100%;
}

.StripeElement--focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
  border-color: #6366f1;
}

.StripeElement--invalid {
  border-color: #ef4444;
}
</style>
