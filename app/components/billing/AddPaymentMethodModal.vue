<script setup lang="ts">
declare global {
  interface Window {
    Stripe?: any;
  }
}

const props = defineProps<{
  modelValue: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'success', paymentMethodId: string): void;
  (e: 'error', error: string): void;
}>();

const { getSetupIntent, addPaymentMethod } = useSubscription();

const paymentElementRef = ref<HTMLDivElement>();
const stripe = ref<any>(null);
const elements = ref<any>(null);
const paymentElement = ref<any>(null);
const paymentComplete = ref(false);
const processing = ref(false);
const errorMessage = ref('');
const clientSecret = ref<string | null>(null);
const supportedPaymentMethods = ref<string[]>([]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

// Initialize Stripe on mount
onMounted(async () => {
  if (typeof window !== 'undefined' && window.Stripe) {
    const config = useRuntimeConfig();
    stripe.value = window.Stripe(config.public.stripePublishableKey);
  } else {
    console.error('Stripe.js not loaded! Make sure to include the Stripe script in your app.');
  }
});

// Initialize Payment Element when modal opens
watch(isOpen, async (open) => {
  if (open && stripe.value) {
    await initializePaymentElement();
  }
}, { immediate: true });

const initializePaymentElement = async () => {
  if (!stripe.value) return;

  processing.value = true;
  errorMessage.value = '';

  try {
    // Get setup intent from backend with supported payment methods
    const setupData = await getSetupIntent('BRL');
    
    if (!setupData?.client_secret) {
      throw new Error('Não foi possível iniciar o processo de pagamento');
    }

    clientSecret.value = setupData.client_secret;
    supportedPaymentMethods.value = setupData.payment_method_types || ['card'];

    // Create Elements instance with the client secret
    elements.value = stripe.value.elements({
      clientSecret: clientSecret.value,
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
        rules: {
          '.Label': {
            color: '#374151',
            fontWeight: '500',
            fontSize: '14px',
          },
        },
      },
    });

    // Create Payment Element (supports multiple payment methods automatically)
    paymentElement.value = elements.value.create('payment', {
      layout: {
        type: 'tabs',
        defaultCollapsed: false,
      },
      paymentMethodOrder: supportedPaymentMethods.value,
      fields: {
        billingDetails: {
          address: {
            country: 'auto',
          },
        },
      },
    });

    // Mount the payment element after DOM is ready
    await nextTick();
    setTimeout(() => {
      if (paymentElementRef.value && paymentElement.value) {
        paymentElement.value.mount(paymentElementRef.value);
        
        paymentElement.value.on('change', (event: any) => {
          paymentComplete.value = event.complete;
          errorMessage.value = event.error?.message || '';
        });
      }
    }, 100);
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao inicializar formulário de pagamento';
  } finally {
    processing.value = false;
  }
};

const handleSubmit = async () => {
  if (!stripe.value || !elements.value) return;
  
  processing.value = true;
  errorMessage.value = '';
  
  try {
    // Confirm setup using Payment Element
    const { setupIntent, error } = await stripe.value.confirmSetup({
      elements: elements.value,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/billing?setup_complete=true`,
      },
    });
    
    if (error) {
      throw new Error(error.message || 'Erro ao adicionar forma de pagamento');
    }
    
    if (setupIntent && setupIntent.status === 'succeeded') {
      // Add payment method to backend
      await addPaymentMethod(setupIntent.payment_method, true);
      emit('success', setupIntent.payment_method);
      handleClose();
    } else if (setupIntent && setupIntent.status === 'processing') {
      // Some payment methods (like bank debits) may take time to process
      emit('success', setupIntent.payment_method);
      handleClose();
    }
  } catch (error: any) {
    errorMessage.value = error.message || 'Erro ao adicionar forma de pagamento';
    emit('error', errorMessage.value);
  } finally {
    processing.value = false;
  }
};

const handleClose = () => {
  if (paymentElement.value) {
    paymentElement.value.destroy();
    paymentElement.value = null;
  }
  elements.value = null;
  clientSecret.value = null;
  paymentComplete.value = false;
  errorMessage.value = '';
  isOpen.value = false;
};

// Get label for supported payment methods
const paymentMethodsLabel = computed(() => {
  const methodNames: Record<string, string> = {
    card: 'Cartão de Crédito/Débito',
    boleto: 'Boleto Bancário',
    us_bank_account: 'Conta Bancária (ACH)',
    sepa_debit: 'Débito SEPA',
    bacs_debit: 'Débito Bacs',
  };
  
  return supportedPaymentMethods.value
    .map(m => methodNames[m] || m)
    .join(', ');
});
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
          Adicione uma forma de pagamento para realizar suas assinaturas e pagamentos.
        </p>

        <!-- Supported Payment Methods Info -->
        <div v-if="supportedPaymentMethods.length > 1" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5" />
          <span>Formas de pagamento disponíveis: {{ paymentMethodsLabel }}</span>
        </div>

        <!-- Stripe Payment Element Container -->
        <div class="space-y-2">
          <div
            ref="paymentElementRef"
            class="min-h-[200px] p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        <!-- Loading State -->
        <div v-if="processing && !paymentElement" class="flex justify-center py-4">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 animate-spin text-primary-500" />
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
            :disabled="!paymentComplete || processing"
            @click="handleSubmit"
          >
            Adicionar Forma de Pagamento
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
