<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Plan, PlanPrice } from '~/composables/useSubscription';

const props = defineProps<{
  plans: Plan[];
  currentPlanSlug?: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', plan: Plan, price: PlanPrice): void;
}>();

const billingInterval = ref<'monthly' | 'yearly'>('monthly');

const filteredPlans = computed(() => {
  return props.plans.map(plan => ({
    ...plan,
    selectedPrice: plan.prices.find(p => p.interval === billingInterval.value) || plan.prices[0],
  }));
});

const isCurrentPlan = (plan: Plan) => {
  return plan.slug === props.currentPlanSlug;
};

const selectPlan = (plan: Plan, price: PlanPrice) => {
  if (!isCurrentPlan(plan)) {
    emit('select', plan, price);
  }
};
</script>

<template>
  <div class="space-y-6">
    <!-- Billing Interval Toggle -->
    <div class="flex justify-center">
      <div class="inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          @click="billingInterval = 'monthly'"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            billingInterval === 'monthly'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          ]"
        >
          Mensal
        </button>
        <button
          @click="billingInterval = 'yearly'"
          :class="[
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            billingInterval === 'yearly'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          ]"
        >
          Anual
          <span class="ml-1 text-xs text-green-600 dark:text-green-400">Economize 20%</span>
        </button>
      </div>
    </div>

    <!-- Plans Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="plan in filteredPlans"
        :key="plan.uuid"
        :class="[
          'relative rounded-2xl border-2 p-6 transition-all',
          plan.is_featured
            ? 'border-primary-500 shadow-lg scale-105'
            : 'border-gray-200 dark:border-gray-700',
          isCurrentPlan(plan)
            ? 'bg-gray-50 dark:bg-gray-800/50'
            : 'bg-white dark:bg-gray-800 hover:border-primary-300 dark:hover:border-primary-700'
        ]"
      >
        <!-- Featured Badge -->
        <div
          v-if="plan.is_featured"
          class="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          <span class="bg-primary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Mais Popular
          </span>
        </div>

        <!-- Current Plan Badge -->
        <div
          v-if="isCurrentPlan(plan)"
          class="absolute -top-3 right-4"
        >
          <span class="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            Plano Atual
          </span>
        </div>

        <!-- Plan Header -->
        <div class="text-center mb-6">
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">
            {{ plan.name }}
          </h3>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ plan.description }}
          </p>
        </div>

        <!-- Price -->
        <div class="text-center mb-6">
          <div class="flex items-baseline justify-center">
            <span class="text-4xl font-bold text-gray-900 dark:text-white">
              {{ plan.selectedPrice?.formatted_price }}
            </span>
            <span class="ml-1 text-gray-500 dark:text-gray-400">
              /{{ billingInterval === 'monthly' ? 'mês' : 'ano' }}
            </span>
          </div>
          <p
            v-if="billingInterval === 'yearly' && plan.selectedPrice"
            class="mt-1 text-sm text-gray-500 dark:text-gray-400"
          >
            {{ plan.selectedPrice.formatted_monthly_equivalent }}/mês
          </p>
        </div>

        <!-- Features -->
        <ul class="space-y-3 mb-6">
          <li class="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            Até {{ plan.limits.max_users }} usuários
          </li>
          <li class="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            Até {{ plan.limits.max_projects }} projetos
          </li>
          <li class="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            {{ plan.limits.max_storage_gb }} GB de armazenamento
          </li>
          <li
            v-for="feature in plan.features"
            :key="feature"
            class="flex items-center text-sm text-gray-600 dark:text-gray-300"
          >
            <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
            {{ feature }}
          </li>
        </ul>

        <!-- Trial Info -->
        <p
          v-if="plan.trial_days > 0"
          class="text-center text-sm text-gray-500 dark:text-gray-400 mb-4"
        >
          {{ plan.trial_days }} dias de teste grátis
        </p>

        <!-- CTA Button -->
        <UButton
          :color="plan.is_featured ? 'primary' : 'neutral'"
          :variant="isCurrentPlan(plan) ? 'outline' : 'solid'"
          :disabled="isCurrentPlan(plan) || loading"
          :loading="loading"
          block
          size="lg"
          @click="selectPlan(plan, plan.selectedPrice!)"
        >
          {{ isCurrentPlan(plan) ? 'Plano Atual' : 'Selecionar Plano' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
