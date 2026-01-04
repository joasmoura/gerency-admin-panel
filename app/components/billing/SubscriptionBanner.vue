<script setup lang="ts">
import type { Subscription } from '~/composables/useSubscription';

const props = defineProps<{
  subscription: Subscription | null;
  compact?: boolean;
}>();

const emit = defineEmits<{
  (e: 'upgrade'): void;
}>();

// Only show for trial or limited courtesy
const shouldShow = computed(() => {
  if (!props.subscription) return false;
  
  // Show for trial
  if (props.subscription.on_trial) return true;
  
  // Show for limited courtesy (has expiration date)
  if (props.subscription.is_courtesy && !props.subscription.courtesy_indefinite) {
    return true;
  }
  
  return false;
});

// Calculate time remaining for display
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
  total: 0,
});

let intervalId: ReturnType<typeof setInterval> | null = null;

const updateCountdown = () => {
  if (!targetDate.value) {
    timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    return;
  }
  
  const now = new Date();
  const diff = targetDate.value.getTime() - now.getTime();
  
  if (diff <= 0) {
    timeRemaining.value = { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    return;
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  timeRemaining.value = { days, hours, minutes, seconds, total: diff };
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
  if (isTrialMode.value) return 'Teste';
  if (isCourtesyMode.value) return 'Cortesia';
  return '';
});

const statusIcon = computed(() => {
  if (isTrialMode.value) return 'i-heroicons-clock';
  if (isCourtesyMode.value) return 'i-heroicons-gift';
  return 'i-heroicons-clock';
});

const isExpired = computed(() => timeRemaining.value.total <= 0);
const isUrgent = computed(() => timeRemaining.value.days < 3 && !isExpired.value);

const bgClass = computed(() => {
  if (isExpired.value) return 'bg-red-600 dark:bg-red-700';
  if (isUrgent.value) return 'bg-amber-500 dark:bg-amber-600';
  if (isCourtesyMode.value) return 'bg-purple-600 dark:bg-purple-700';
  return 'bg-primary-600 dark:bg-primary-700';
});

const formatNumber = (num: number) => String(num).padStart(2, '0');
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
      v-if="shouldShow"
      :class="[
        'w-full text-white text-sm',
        compact ? 'py-1.5 px-3' : 'py-2.5 px-4',
        bgClass
      ]"
    >
      <div class="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
        <!-- Left: Status & Countdown -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <UIcon :name="statusIcon" class="w-4 h-4" />
            <span class="font-medium">{{ statusLabel }}</span>
          </div>

          <!-- Countdown -->
          <div class="flex items-center gap-1 font-mono text-sm bg-white/20 rounded px-2 py-0.5">
            <span>{{ formatNumber(timeRemaining.days) }}d</span>
            <span>:</span>
            <span>{{ formatNumber(timeRemaining.hours) }}h</span>
            <span>:</span>
            <span>{{ formatNumber(timeRemaining.minutes) }}m</span>
            <span>:</span>
            <span>{{ formatNumber(timeRemaining.seconds) }}s</span>
          </div>

          <!-- Warning text -->
          <span v-if="isExpired" class="font-semibold flex items-center gap-1">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
            Período expirado!
          </span>
          <span v-else-if="isUrgent" class="text-sm flex items-center gap-1">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4" />
            Expira em breve!
          </span>
        </div>

        <!-- Right: Action Button -->
        <UButton
          color="neutral"
          variant="solid"
          size="xs"
          @click="emit('upgrade')"
        >
          <UIcon name="i-heroicons-arrow-up-circle" class="w-4 h-4 mr-1" />
          {{ isTrialMode ? 'Assinar agora' : 'Escolher plano' }}
        </UButton>
      </div>
    </div>
  </Transition>
</template>
