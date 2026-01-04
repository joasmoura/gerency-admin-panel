<script setup lang="ts">
import type { Invoice } from '~/composables/useSubscription';

const props = defineProps<{
  invoices: Invoice[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'download', invoice: Invoice): void;
  (e: 'view', invoice: Invoice): void;
}>();

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const getStatusColor = (invoice: Invoice) => {
  if (invoice.is_paid) return 'green';
  if (invoice.is_overdue) return 'red';
  if (invoice.status === 'open') return 'yellow';
  if (invoice.status === 'void') return 'gray';
  return 'gray';
};

const getStatusLabel = (invoice: Invoice) => {
  if (invoice.is_paid) return 'Pago';
  if (invoice.is_overdue) return 'Vencido';
  if (invoice.status === 'open') return 'Em aberto';
  if (invoice.status === 'void') return 'Cancelado';
  if (invoice.status === 'draft') return 'Rascunho';
  return invoice.status;
};
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
          Histórico de Faturas
        </h3>
      </div>
    </template>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-gray-400 animate-spin" />
    </div>

    <!-- Empty State -->
    <div v-else-if="invoices.length === 0" class="text-center py-8">
      <UIcon name="i-heroicons-document-text" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400">Nenhuma fatura encontrada</p>
    </div>

    <!-- Invoice List -->
    <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
      <div
        v-for="invoice in invoices"
        :key="invoice.uuid"
        class="py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 transition-colors"
      >
        <div class="flex-1">
          <div class="flex items-center gap-3">
            <div>
              <p class="font-medium text-gray-900 dark:text-white">
                {{ invoice.number || 'Fatura' }}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ formatDate(invoice.invoice_date) }}
                <span v-if="invoice.plan" class="ml-2">• {{ invoice.plan.name }}</span>
              </p>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <!-- Amount -->
          <div class="text-right">
            <p class="font-medium text-gray-900 dark:text-white">
              {{ invoice.formatted_total }}
            </p>
            <UBadge :color="getStatusColor(invoice) as any" variant="subtle" size="xs">
              {{ getStatusLabel(invoice) }}
            </UBadge>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-eye"
              @click="emit('view', invoice)"
            />
            <UButton
              v-if="invoice.is_paid"
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-heroicons-arrow-down-tray"
              @click="emit('download', invoice)"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
