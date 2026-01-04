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

const isExpired = computed(() => {
  if (!props.paymentMethod.card?.exp_month || !props.paymentMethod.card?.exp_year) return false;
  
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

const cardBrand = computed(() => props.paymentMethod.card?.brand || '');
const cardLast4 = computed(() => props.paymentMethod.card?.last4 || '****');
</script>

<template>
  <UCard>
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <!-- Card Brand Icon -->
        <div class="flex-shrink-0 w-12 h-8 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
          <UIcon :name="getBrandIcon(cardBrand)" class="w-8 h-5 text-gray-600 dark:text-gray-400" />
        </div>

        <!-- Card Details -->
        <div>
          <div class="flex items-center gap-2">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ getBrandLabel(cardBrand) }} •••• {{ cardLast4 }}
            </p>
            <UBadge v-if="isDefault" color="primary" variant="subtle" size="xs">
              Principal
            </UBadge>
            <UBadge v-if="isExpired" color="error" variant="subtle" size="xs">
              Expirado
            </UBadge>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Expira em {{ expirationText }}
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
