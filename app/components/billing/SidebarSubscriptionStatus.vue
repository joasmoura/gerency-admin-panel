<script setup lang="ts">
import type { Subscription } from '~/composables/useSubscription';

const props = defineProps<{
  subscription: Subscription | null;
  collapsed?: boolean;
}>();

const router = useRouter();

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

const badgeColor = computed(() => {
  if (isExpired.value) return 'error';
  if (isUrgent.value) return 'warning';
  if (isCourtesyMode.value) return 'secondary';
  return 'info';
});

const formatNumber = (num: number) => String(num).padStart(2, '0');

const handleClick = () => {
  router.push('/settings/billing/plans');
};
</script>

<template>
  <div v-if="shouldShow" class="px-2 py-1">
    <!-- Collapsed Mode: Only icon with tooltip -->
    <UTooltip v-if="collapsed" :text="`${statusLabel}: ${timeRemaining.days}d ${timeRemaining.hours}h ${timeRemaining.minutes}m`">
      <UButton
        :icon="statusIcon"
        :color="badgeColor"
        variant="soft"
        size="sm"
        square
        @click="handleClick"
      />
    </UTooltip>

    <!-- Expanded Mode: Full info -->
    <div 
      v-else
      :class="[
        'rounded-lg p-2 cursor-pointer transition-colors',
        isExpired ? 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50' :
        isUrgent ? 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50' :
        isCourtesyMode ? 'bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50' :
        'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50'
      ]"
      @click="handleClick"
    >
      <div class="flex items-center gap-2 mb-1">
        <UIcon 
          :name="statusIcon" 
          :class="[
            'w-4 h-4',
            isExpired ? 'text-red-600 dark:text-red-400' :
            isUrgent ? 'text-amber-600 dark:text-amber-400' :
            isCourtesyMode ? 'text-purple-600 dark:text-purple-400' :
            'text-blue-600 dark:text-blue-400'
          ]"
        />
        <span 
          :class="[
            'text-xs font-semibold',
            isExpired ? 'text-red-700 dark:text-red-300' :
            isUrgent ? 'text-amber-700 dark:text-amber-300' :
            isCourtesyMode ? 'text-purple-700 dark:text-purple-300' :
            'text-blue-700 dark:text-blue-300'
          ]"
        >
          {{ statusLabel }}
        </span>
        <UBadge 
          v-if="isExpired"
          color="error" 
          variant="subtle" 
          size="xs"
        >
          Expirado
        </UBadge>
        <UBadge 
          v-else-if="isUrgent"
          color="warning" 
          variant="subtle" 
          size="xs"
        >
          Urgente
        </UBadge>
      </div>
      
      <!-- Countdown -->
      <div 
        :class="[
          'text-xs font-mono flex items-center gap-1',
          isExpired ? 'text-red-600 dark:text-red-400' :
          isUrgent ? 'text-amber-600 dark:text-amber-400' :
          isCourtesyMode ? 'text-purple-600 dark:text-purple-400' :
          'text-blue-600 dark:text-blue-400'
        ]"
      >
        <span>{{ formatNumber(timeRemaining.days) }}d</span>
        <span>:</span>
        <span>{{ formatNumber(timeRemaining.hours) }}h</span>
        <span>:</span>
        <span>{{ formatNumber(timeRemaining.minutes) }}m</span>
        <span>:</span>
        <span>{{ formatNumber(timeRemaining.seconds) }}s</span>
      </div>
    </div>
  </div>
</template>
