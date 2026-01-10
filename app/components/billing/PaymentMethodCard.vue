<script setup lang="ts">
import type { PaymentMethod } from '~/composables/useSubscription';

const props = defineProps<{
  paymentMethod: PaymentMethod;
  isDefault?: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'set-default', paymentMethod: PaymentMethod): void;
  (e: 'remove', paymentMethod: PaymentMethod): void;
}>();

// Get icon based on payment method type
const getPaymentMethodIcon = computed(() => {
  const type = props.paymentMethod.type;
  
  if (type === 'card' && props.paymentMethod.card) {
    return getBrandIcon(props.paymentMethod.card.brand);
  }
  
  switch (type) {
    case 'boleto':
      return 'i-heroicons-document-text';
    case 'us_bank_account':
      return 'i-heroicons-building-library';
    case 'sepa_debit':
      return 'i-heroicons-building-library';
    case 'bacs_debit':
      return 'i-heroicons-building-library';
    default:
      return 'i-heroicons-credit-card';
  }
});

const getBrandIcon = (brand: string) => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return 'i-simple-icons-visa';
    case 'mastercard':
      return 'i-simple-icons-mastercard';
    case 'amex':
      return 'i-simple-icons-americanexpress';
    case 'discover':
      return 'i-simple-icons-discover';
    case 'diners':
      return 'i-simple-icons-dinersclub';
    default:
      return 'i-heroicons-credit-card';
  }
};

const getBrandLabel = (brand: string) => {
  switch (brand?.toLowerCase()) {
    case 'visa':
      return 'Visa';
    case 'mastercard':
      return 'Mastercard';
    case 'amex':
      return 'American Express';
    case 'discover':
      return 'Discover';
    case 'diners':
      return 'Diners Club';
    default:
      return brand || 'Cartão';
  }
};

// Get payment method type label
const getPaymentMethodTypeLabel = computed(() => {
  const type = props.paymentMethod.type;
  
  switch (type) {
    case 'card':
      return 'Cartão de Crédito/Débito';
    case 'boleto':
      return 'Boleto Bancário';
    case 'us_bank_account':
      return 'Conta Bancária (ACH)';
    case 'sepa_debit':
      return 'Débito SEPA';
    case 'bacs_debit':
      return 'Débito Bacs';
    default:
      return type;
  }
});

// Get display title based on payment method type
const displayTitle = computed(() => {
  const pm = props.paymentMethod;
  
  if (pm.type === 'card' && pm.card) {
    return `${getBrandLabel(pm.card.brand)} •••• ${pm.card.last4}`;
  }
  
  if (pm.type === 'boleto' && pm.boleto) {
    return `Boleto Bancário${pm.boleto.tax_id ? ` (${pm.boleto.tax_id})` : ''}`;
  }
  
  if (pm.type === 'us_bank_account' && pm.us_bank_account) {
    return `${pm.us_bank_account.bank_name} •••• ${pm.us_bank_account.last4}`;
  }
  
  if (pm.type === 'sepa_debit' && pm.sepa_debit) {
    return `SEPA •••• ${pm.sepa_debit.last4} (${pm.sepa_debit.country})`;
  }
  
  if (pm.type === 'bacs_debit' && pm.bacs_debit) {
    return `Bacs •••• ${pm.bacs_debit.last4}`;
  }
  
  return getPaymentMethodTypeLabel.value;
});

// Get subtitle/details based on payment method type
const displaySubtitle = computed(() => {
  const pm = props.paymentMethod;
  
  if (pm.type === 'card' && pm.card) {
    return `Expira em ${expirationText.value}`;
  }
  
  if (pm.type === 'us_bank_account' && pm.us_bank_account) {
    return pm.us_bank_account.account_type === 'checking' 
      ? 'Conta Corrente'
      : 'Conta Poupança';
  }
  
  return getPaymentMethodTypeLabel.value;
});

const isExpired = computed(() => {
  if (props.paymentMethod.type !== 'card' || !props.paymentMethod.card?.exp_month || !props.paymentMethod.card?.exp_year) {
    return false;
  }
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  return props.paymentMethod.card.exp_year < currentYear || 
    (props.paymentMethod.card.exp_year === currentYear && props.paymentMethod.card.exp_month < currentMonth);
});

const expirationText = computed(() => {
  if (!props.paymentMethod.card?.exp_month || !props.paymentMethod.card?.exp_year) return '';
  return `${String(props.paymentMethod.card.exp_month).padStart(2, '0')}/${props.paymentMethod.card.exp_year}`;
});
</script>

<template>
  <UCard>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Payment Method Icon -->
        <div class="flex-shrink-0 w-12 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
          <UIcon :name="getPaymentMethodIcon" class="w-8 h-5 text-gray-600 dark:text-gray-400" />
        </div>

        <!-- Payment Method Details -->
        <div>
          <div class="flex items-center gap-2">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ displayTitle }}
            </p>
            <UBadge v-if="isDefault" color="primary" variant="subtle" size="xs">
              Principal
            </UBadge>
            <UBadge v-if="isExpired" color="error" variant="subtle" size="xs">
              Expirado
            </UBadge>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ displaySubtitle }}
          </p>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <UButton
          v-if="!isDefault"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="loading"
          @click="emit('set-default', paymentMethod)"
        >
          Definir como principal
        </UButton>
        <UButton
          v-if="!isDefault"
          color="error"
          variant="ghost"
          size="sm"
          icon="i-heroicons-trash"
          :loading="loading"
          @click="emit('remove', paymentMethod)"
        />
      </div>
    </div>
  </UCard>
</template>
