<script setup lang="ts">
import type { Subscription } from '~/composables/useSubscription';

const props = defineProps<{
  subscription: Subscription | null;
}>();

// Only show for trial or limited courtesy (not indefinite)
const show = computed(() => {
  if (!props.subscription) return false;
  
  // Show for trial
  if (props.subscription.on_trial) return true;
  
  // Show for limited courtesy (has expiration date)
  if (props.subscription.is_courtesy && !props.subscription.courtesy_indefinite) {
    return true;
  }
  
  return false;
});

// Calculate time remaining
const targetDate = computed(() => {
  if (!props.subscription) return null;
  
  if (props.subscription.on_trial && props.subscription.trial_ends_at) {
    return new Date(props.subscription.trial_ends_at);
  }
  
  if (props.subscription.is_courtesy && props.subscription.courtesy_expires_at) {
    return new Date(props.subscription.courtesy_expires_at);
  }
  
  return null;
});

// Countdown state
const timeRemaining = ref({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
});

// Update countdown every second
let intervalId: ReturnType<typeof setInterval> | null = null;

const updateCountdown = () => {
  if (!targetDate.value) {
    timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return;
  }
  
  const now = new Date();
  const diff = targetDate.value.getTime() - now.getTime();
  
  if (diff <= 0) {
    timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  timeRemaining.value = { days, hours, minutes, seconds };
};

onMounted(() => {
  updateCountdown();
  intervalId = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
  }
});

// Type-specific computed values
const isTrialMode = computed(() => props.subscription?.on_trial ?? false);
const isCourtesyMode = computed(() => props.subscription?.is_courtesy && !props.subscription?.courtesy_indefinite);

const statusLabel = computed(() => {
  if (isTrialMode.value) return 'Período de Teste';
  if (isCourtesyMode.value) return 'Cortesia';
  return '';
});

const statusIcon = computed(() => {
  if (isTrialMode.value) return 'i-heroicons-clock';
  if (isCourtesyMode.value) return 'i-heroicons-gift';
  return 'i-heroicons-clock';
});

const statusColor = computed(() => {
  if (isTrialMode.value) return 'blue';
  if (isCourtesyMode.value) return 'purple';
  return 'blue';
});

const isExpired = computed(() => {
  if (!targetDate.value) return false;
  return targetDate.value.getTime() <= Date.now();
});

const isUrgent = computed(() => {
  // Less than 3 days remaining
  return timeRemaining.value.days < 3 && !isExpired.value;
});

const bgClass = computed(() => {
  if (isExpired.value) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  if (isUrgent.value) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  if (isCourtesyMode.value) return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
  return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
});

const textClass = computed(() => {
  if (isExpired.value) return 'text-red-800 dark:text-red-200';
  if (isUrgent.value) return 'text-amber-800 dark:text-amber-200';
  if (isCourtesyMode.value) return 'text-purple-800 dark:text-purple-200';
  return 'text-blue-800 dark:text-blue-200';
});

const iconClass = computed(() => {
  if (isExpired.value) return 'text-red-600 dark:text-red-400';
  if (isUrgent.value) return 'text-amber-600 dark:text-amber-400';
  if (isCourtesyMode.value) return 'text-purple-600 dark:text-purple-400';
  return 'text-blue-600 dark:text-blue-400';
});

const formatNumber = (num: number) => String(num).padStart(2, '0');
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="show"
      :class="[
        'rounded-lg border px-4 py-3',
        bgClass
      ]"
    >
      <div class="flex items-center justify-between flex-wrap gap-3">
        <!-- Status Label -->
        <div class="flex items-center gap-2">
          <UIcon
            :name="statusIcon"
            :class="['w-5 h-5', iconClass]"
          />
          <span :class="['font-medium text-sm', textClass]">
            {{ statusLabel }}
          </span>
        </div>

        <!-- Countdown Timer -->
        <div class="flex items-center gap-1">
          <!-- Days -->
          <div class="flex flex-col items-center">
            <div :class="['text-lg font-bold tabular-nums', textClass]">
              {{ formatNumber(timeRemaining.days) }}
            </div>
            <div :class="['text-xs opacity-70', textClass]">dias</div>
          </div>
          <span :class="['text-lg font-bold mx-0.5', textClass]">:</span>
          
          <!-- Hours -->
          <div class="flex flex-col items-center">
            <div :class="['text-lg font-bold tabular-nums', textClass]">
              {{ formatNumber(timeRemaining.hours) }}
            </div>
            <div :class="['text-xs opacity-70', textClass]">hrs</div>
          </div>
          <span :class="['text-lg font-bold mx-0.5', textClass]">:</span>
          
          <!-- Minutes -->
          <div class="flex flex-col items-center">
            <div :class="['text-lg font-bold tabular-nums', textClass]">
              {{ formatNumber(timeRemaining.minutes) }}
            </div>
            <div :class="['text-xs opacity-70', textClass]">min</div>
          </div>
          <span :class="['text-lg font-bold mx-0.5', textClass]">:</span>
          
          <!-- Seconds -->
          <div class="flex flex-col items-center">
            <div :class="['text-lg font-bold tabular-nums', textClass]">
              {{ formatNumber(timeRemaining.seconds) }}
            </div>
            <div :class="['text-xs opacity-70', textClass]">seg</div>
          </div>
        </div>

        <!-- Warning if urgent or expired -->
        <div v-if="isExpired" :class="['flex items-center gap-2 text-sm font-medium', textClass]">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
          Período expirado!
        </div>
        <div v-else-if="isUrgent" :class="['flex items-center gap-2 text-sm', textClass]">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
          Expira em breve!
        </div>
      </div>
    </div>
  </Transition>
</template>
