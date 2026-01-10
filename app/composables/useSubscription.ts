import { ref, computed } from 'vue';

// Types
export interface Plan {
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  features: string[];
  features_list?: string[];
  limits: {
    max_users: number;
    max_projects: number;
    max_storage_gb: number;
    storage_mb?: number;
  };
  trial_days: number;
  is_featured: boolean;
  sort_order?: number;
  prices: PlanPrice[];
}

export interface PlanPrice {
  uuid: string;
  interval: 'monthly' | 'yearly';
  amount: number;
  formatted_price: string;
  formatted_amount?: string;
  formatted_monthly_equivalent: string;
  discount_percentage: number;
  currency: string;
  is_active?: boolean;
}

export interface Subscription {
  uuid: string;
  has_subscription: boolean;
  has_access: boolean;
  status: string;
  is_active: boolean;
  is_courtesy: boolean;
  courtesy_reason: string | null;
  courtesy_expires_at: string | null;
  courtesy_indefinite: boolean;
  on_trial: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  days_until_period_end: number;
  plan: {
    uuid: string;
    name: string;
    slug: string;
    limits: {
      max_users: number;
      max_projects: number;
      max_storage_gb: number;
    };
  } | null;
  price: {
    uuid: string;
    interval: string;
    formatted_price: string;
  } | null;
}

export interface Invoice {
  uuid: string;
  number: string | null;
  status: string;
  total: number;
  formatted_total: string;
  amount_paid: number;
  formatted_amount_paid: string;
  amount_due: number;
  formatted_amount_due: string;
  currency: string;
  invoice_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  is_paid: boolean;
  is_overdue: boolean;
  billing_reason: string | null;
  plan: {
    name: string;
  } | null;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
    funding?: string;
  } | null;
  boleto?: {
    tax_id: string | null;
  } | null;
  us_bank_account?: {
    bank_name: string;
    last4: string;
    account_type: string;
  } | null;
  sepa_debit?: {
    bank_code: string;
    last4: string;
    country: string;
  } | null;
  bacs_debit?: {
    sort_code: string;
    last4: string;
  } | null;
  is_default: boolean;
  created?: number;
}

export interface AvailablePaymentMethod {
  id: string;
  name: string;
  name_pt: string;
  icon: string;
  currencies: string[];
  recurring: boolean;
  processing_time?: string;
}

export function useSubscription() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase;
  
  const loading = ref(false);
  const error = ref<any>(null);
  
  // State
  const subscription = ref<Subscription | null>(null);
  const plans = ref<Plan[]>([]);
  const invoices = ref<Invoice[]>([]);
  const paymentMethods = ref<PaymentMethod[]>([]);

  // Computed
  const hasAccess = computed(() => subscription.value?.has_access ?? false);
  const isOnTrial = computed(() => subscription.value?.on_trial ?? false);
  const isCourtesy = computed(() => subscription.value?.is_courtesy ?? false);
  const isActive = computed(() => subscription.value?.is_active ?? false);
  const currentPlan = computed(() => subscription.value?.plan ?? null);
  const willCancel = computed(() => subscription.value?.cancel_at_period_end ?? false);
  const defaultPaymentMethod = computed(() => paymentMethods.value.find(pm => pm.is_default) ?? null);
  const trialDaysRemaining = computed(() => subscription.value?.trial_days_remaining ?? 0);

  const statusLabel = computed(() => {
    if (!subscription.value) return 'Sem assinatura';
    if (subscription.value.is_courtesy) {
      return subscription.value.courtesy_indefinite 
        ? 'Cortesia (Indefinida)' 
        : 'Cortesia';
    }
    if (subscription.value.on_trial) return 'Período de Teste';
    if (subscription.value.cancel_at_period_end) return 'Cancelamento Agendado';
    
    const statusMap: Record<string, string> = {
      active: 'Ativo',
      past_due: 'Pagamento Pendente',
      canceled: 'Cancelado',
      expired: 'Expirado',
      trialing: 'Período de Teste',
      courtesy: 'Cortesia',
    };
    return statusMap[subscription.value.status] || subscription.value.status;
  });

  const statusColor = computed(() => {
    if (!subscription.value) return 'gray';
    if (subscription.value.is_courtesy) return 'purple';
    if (subscription.value.on_trial) return 'blue';
    if (subscription.value.cancel_at_period_end) return 'orange';
    
    const colorMap: Record<string, string> = {
      active: 'green',
      past_due: 'yellow',
      canceled: 'red',
      expired: 'red',
      trialing: 'blue',
      courtesy: 'purple',
    };
    return colorMap[subscription.value.status] || 'gray';
  });

  // Helper for auth headers
  const getAuthHeaders = () => {
    const auth = AuthStore();
    return {
      'Authorization': `Bearer ${auth.token}`,
      'tenant-uuid': auth.selectedTenant?.uuid || '',
      'Content-Type': 'application/json',
    };
  };

  // =========================================================================
  // API Methods
  // =========================================================================

  // Fetch current subscription status
  const fetchSubscription = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/status`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      console.error('Failed to fetch subscription:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Alias for fetchSubscription
  const refreshSubscription = fetchSubscription;

  // Fetch available plans
  const fetchPlans = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Plan[] }>(`${baseURL}/billing/plans`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      plans.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      console.error('Failed to fetch plans:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Start trial
  const startTrial = async (planUuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/trial`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { plan_uuid: planUuid },
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Subscribe (create subscription)
  const subscribe = async (priceUuid: string, paymentMethodId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/subscribe`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { 
          price_uuid: priceUuid,
          payment_method_id: paymentMethodId,
        },
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Change plan
  const changePlan = async (priceUuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/change-plan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { price_uuid: priceUuid },
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Preview plan change (proration)
  const previewPlanChange = async (priceUuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: any }>(`${baseURL}/billing/subscription/preview-change`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { price_uuid: priceUuid },
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Cancel subscription at period end
  const cancelSubscription = async (reason?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { reason },
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Cancel subscription immediately
  const cancelImmediately = async (reason?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/cancel-immediately`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { reason },
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Resume subscription
  const resumeSubscription = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/resume`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Reactivate subscription
  const reactivateSubscription = async (priceUuid: string, paymentMethodId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Subscription }>(`${baseURL}/billing/subscription/reactivate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { 
          price_uuid: priceUuid,
          payment_method_id: paymentMethodId,
        },
      });
      subscription.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // Payment Methods
  // =========================================================================

  const fetchPaymentMethods = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: PaymentMethod[] }>(`${baseURL}/billing/payment-methods`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      paymentMethods.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchAvailablePaymentMethods = async (currency?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const params = currency ? `?currency=${currency}` : '';
      const response = await $fetch<{ data: AvailablePaymentMethod[], currency: string }>(`${baseURL}/billing/payment-methods/available${params}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getSetupIntent = async (currency?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: { client_secret: string, payment_method_types: string[] } }>(`${baseURL}/billing/payment-methods/setup-intent`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { currency: currency || 'BRL' },
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addPaymentMethod = async (paymentMethodId: string, setAsDefault = true) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/billing/payment-methods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { 
          payment_method_id: paymentMethodId,
          set_as_default: setAsDefault,
        },
      });
      await fetchPaymentMethods();
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const removePaymentMethod = async (paymentMethodId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/billing/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await fetchPaymentMethods();
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/billing/payment-methods/${paymentMethodId}/default`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      await fetchPaymentMethods();
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // Invoices
  // =========================================================================

  const fetchInvoices = async (limit = 20) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Invoice[] }>(`${baseURL}/billing/invoices`, {
        method: 'GET',
        headers: getAuthHeaders(),
        params: { limit },
      });
      invoices.value = response.data;
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getInvoiceDownloadUrl = async (invoiceUuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: { pdf_url: string; hosted_invoice_url: string } }>(
        `${baseURL}/billing/invoices/${invoiceUuid}/download`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Download invoice and open PDF
  const downloadInvoice = async (invoiceUuid: string) => {
    const urls = await getInvoiceDownloadUrl(invoiceUuid);
    if (urls?.pdf_url) {
      window.open(urls.pdf_url, '_blank');
    }
    return urls;
  };

  return {
    // State
    loading,
    error,
    subscription,
    plans,
    invoices,
    paymentMethods,
    
    // Computed
    hasAccess,
    isOnTrial,
    isCourtesy,
    isActive,
    currentPlan,
    willCancel,
    statusLabel,
    statusColor,
    defaultPaymentMethod,
    trialDaysRemaining,
    
    // Subscription methods
    fetchSubscription,
    refreshSubscription,
    fetchPlans,
    startTrial,
    subscribe,
    changePlan,
    previewPlanChange,
    cancelSubscription,
    cancelImmediately,
    resumeSubscription,
    reactivateSubscription,
    
    // Payment methods
    fetchPaymentMethods,
    fetchAvailablePaymentMethods,
    getSetupIntent,
    addPaymentMethod,
    removePaymentMethod,
    setDefaultPaymentMethod,
    
    // Invoices
    fetchInvoices,
    getInvoiceDownloadUrl,
    downloadInvoice,
  };
}
