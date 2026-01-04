<script setup lang="ts">
import { computed } from 'vue';
import type { Subscription } from '~/composables/useSubscription';

const props = defineProps<{
  subscription: Subscription;
}>();

const emit = defineEmits<{
  (e: 'upgrade'): void;
  (e: 'cancel'): void;
  (e: 'resume'): void;
  (e: 'manage-payment'): void;
}>();

const statusConfig = computed(() => {
  const s = props.subscription;
  
  if (s.is_courtesy) {
    return {
      color: 'purple',
      icon: 'i-heroicons-gift',
      label: s.courtesy_indefinite ? 'Cortesia Indefinida' : 'Cortesia',
      description: s.courtesy_reason || 'Acesso cortesia concedido',
    };
  }
  
  if (s.on_trial) {
    return {
      color: 'blue',
      icon: 'i-heroicons-clock',
      label: 'Período de Teste',
      description: `${s.trial_days_remaining} dias restantes`,
    };
  }
  
  if (s.cancel_at_period_end) {
    return {
      color: 'orange',
      icon: 'i-heroicons-exclamation-triangle',
      label: 'Cancelamento Agendado',
      description: `Acesso até ${formatDate(s.current_period_end)}`,
    };
  }
  
  const statusMap: Record<string, { color: string; icon: string; label: string; description: string }> = {
    active: {
      color: 'green',
      icon: 'i-heroicons-check-circle',
      label: 'Ativo',
      description: `Próxima cobrança em ${formatDate(s.current_period_end)}`,
    },
    past_due: {
      color: 'yellow',
      icon: 'i-heroicons-exclamation-circle',
      label: 'Pagamento Pendente',
      description: 'Por favor, atualize seu método de pagamento',
    },
    canceled: {
      color: 'red',
      icon: 'i-heroicons-x-circle',
      label: 'Cancelado',
      description: 'Sua assinatura foi cancelada',
    },
    expired: {
      color: 'red',
      icon: 'i-heroicons-x-circle',
      label: 'Expirado',
      description: 'Sua assinatura expirou',
    },
  };
  
  return statusMap[s.status] || {
    color: 'gray',
    icon: 'i-heroicons-question-mark-circle',
    label: s.status,
    description: '',
  };
});

const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Status da Assinatura
        </h3>
        <UBadge :color="statusConfig.color as any" variant="subtle">
          <UIcon :name="statusConfig.icon" class="w-4 h-4 mr-1" />
          {{ statusConfig.label }}
        </UBadge>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Current Plan -->
      <div v-if="subscription.plan" class="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Plano</p>
          <p class="font-medium text-gray-900 dark:text-white">{{ subscription.plan.name }}</p>
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-500 dark:text-gray-400">Preço</p>
          <p class="font-medium text-gray-900 dark:text-white">
            {{ subscription.price?.formatted_price || 'Grátis' }}
            <span v-if="subscription.price" class="text-sm text-gray-500">/{{ subscription.price.interval === 'monthly' ? 'mês' : 'ano' }}</span>
          </p>
        </div>
      </div>

      <!-- Status Description -->
      <div class="py-3 border-b border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ statusConfig.description }}</p>
      </div>

      <!-- Trial Info -->
      <div v-if="subscription.on_trial" class="py-3 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Fim do período de teste</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(subscription.trial_ends_at) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-gray-500 dark:text-gray-400">Dias restantes</p>
            <p class="font-medium text-blue-600 dark:text-blue-400">{{ subscription.trial_days_remaining }} dias</p>
          </div>
        </div>
        <UProgress 
          :value="100 - (subscription.trial_days_remaining / 14 * 100)" 
          :max="100" 
          color="info"
          class="mt-3"
        />
      </div>

      <!-- Courtesy Info -->
      <div v-if="subscription.is_courtesy" class="py-3 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Tipo de cortesia</p>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ subscription.courtesy_indefinite ? 'Indefinida' : 'Com data de expiração' }}
            </p>
          </div>
          <div v-if="subscription.courtesy_expires_at" class="text-right">
            <p class="text-sm text-gray-500 dark:text-gray-400">Válido até</p>
            <p class="font-medium text-purple-600 dark:text-purple-400">
              {{ formatDate(subscription.courtesy_expires_at) }}
            </p>
          </div>
        </div>
        <div v-if="subscription.courtesy_reason" class="mt-2">
          <p class="text-sm text-gray-500 dark:text-gray-400">Motivo</p>
          <p class="text-sm text-gray-700 dark:text-gray-300">{{ subscription.courtesy_reason }}</p>
        </div>
      </div>

      <!-- Plan Limits -->
      <div v-if="subscription.plan" class="py-3">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Limites do Plano</p>
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ subscription.plan.limits.max_users }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Usuários</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ subscription.plan.limits.max_projects }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Projetos</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ subscription.plan.limits.max_storage_gb }} GB</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Armazenamento</p>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex flex-wrap gap-2">
        <!-- Upgrade Button -->
        <UButton
          v-if="subscription.on_trial || subscription.is_active"
          color="primary"
          variant="solid"
          @click="emit('upgrade')"
        >
          <UIcon name="i-heroicons-arrow-up-circle" class="w-4 h-4 mr-1" />
          {{ subscription.on_trial ? 'Escolher Plano' : 'Alterar Plano' }}
        </UButton>

        <!-- Resume Button -->
        <UButton
          v-if="subscription.cancel_at_period_end"
          color="success"
          variant="soft"
          @click="emit('resume')"
        >
          <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 mr-1" />
          Manter Assinatura
        </UButton>

        <!-- Manage Payment -->
        <UButton
          v-if="subscription.is_active || subscription.status === 'past_due'"
          color="neutral"
          variant="soft"
          @click="emit('manage-payment')"
        >
          <UIcon name="i-heroicons-credit-card" class="w-4 h-4 mr-1" />
          Pagamento
        </UButton>

        <!-- Cancel Button -->
        <UButton
          v-if="(subscription.is_active || subscription.on_trial) && !subscription.cancel_at_period_end && !subscription.is_courtesy"
          color="error"
          variant="ghost"
          @click="emit('cancel')"
        >
          Cancelar
        </UButton>
      </div>
    </template>
  </UCard>
</template>
