<script setup lang="ts">
import type { Subscription } from '~/composables/useSubscription';

const props = defineProps<{
  subscription: Subscription | null;
}>();

const emit = defineEmits<{
  (e: 'upgrade'): void;
  (e: 'add-payment-method'): void;
}>();

const show = computed(() => {
  if (!props.subscription) return false;
  return props.subscription.on_trial && !props.subscription.is_courtesy;
});

const daysRemaining = computed(() => {
  if (!props.subscription?.trial_days_remaining) {
    if (!props.subscription?.trial_ends_at) return 0;
    const now = new Date();
    const trialEnd = new Date(props.subscription.trial_ends_at);
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
  return props.subscription.trial_days_remaining;
});

const isUrgent = computed(() => daysRemaining.value <= 3);

const trialEndDate = computed(() => {
  if (!props.subscription?.trial_ends_at) return '';
  return new Date(props.subscription.trial_ends_at).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  });
});

const bannerColor = computed(() => isUrgent.value ? 'red' : 'primary');

const bannerBgClass = computed(() => {
  return isUrgent.value
    ? 'bg-red-600 dark:bg-red-700'
    : 'bg-primary-600 dark:bg-primary-700';
});
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="-translate-y-full opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-full opacity-0"
  >
    <div
      v-if="show"
      :class="[
        'w-full py-3 px-4 text-white',
        bannerBgClass
      ]"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <div class="flex items-center gap-3">
          <UIcon
            :name="isUrgent ? 'i-heroicons-exclamation-triangle' : 'i-heroicons-clock'"
            class="w-5 h-5 flex-shrink-0"
          />
          <div class="text-sm">
            <span v-if="isUrgent" class="font-semibold">
              Seu período de teste expira em {{ daysRemaining }} {{ daysRemaining === 1 ? 'dia' : 'dias' }}!
            </span>
            <span v-else class="font-medium">
              Você está no período de teste
            </span>
            <span class="hidden sm:inline ml-1">
              — 
              <span v-if="isUrgent">
                Adicione uma forma de pagamento para não perder acesso.
              </span>
              <span v-else>
                Restam {{ daysRemaining }} dias (até {{ trialEndDate }}).
              </span>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            @click="emit('add-payment-method')"
          >
            <UIcon name="i-heroicons-credit-card" class="w-4 h-4 mr-1" />
            Adicionar Pagamento
          </UButton>
          <UButton
            color="neutral"
            variant="solid"
            size="sm"
            @click="emit('upgrade')"
          >
            <UIcon name="i-heroicons-arrow-up-circle" class="w-4 h-4 mr-1" />
            Assinar Agora
          </UButton>
        </div>
      </div>
    </div>
  </Transition>
</template>
