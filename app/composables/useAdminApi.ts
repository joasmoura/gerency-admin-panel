import { ref, computed } from 'vue';
import { useAdminAuthStore, type AdminUser } from '~/stores/adminAuthStore';

export interface DashboardStats {
  overview: {
    total_tenants: number;
    total_users: number;
    total_plans: number;
    new_tenants_this_month: number;
  };
  subscriptions: {
    active: number;
    trialing: number;
    courtesy: number;
    breakdown: Record<string, number>;
  };
  revenue: {
    mrr: number;
    formatted_mrr: string;
  };
  alerts: {
    trials_expiring_soon: number;
    churn_this_month: number;
  };
}

export interface Plan {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  max_users: number;
  max_projects: number;
  max_storage_gb: number;
  features: string[];
  trial_days: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  prices: PlanPrice[];
  active_prices?: PlanPrice[];
}

export interface PlanPrice {
  id: number;
  uuid: string;
  plan_id: number;
  stripe_price_id: string | null;
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  discount_percentage: number;
  is_active: boolean;
}

// Type for creating/updating prices (without server-generated fields)
export interface PlanPriceInput {
  amount: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  discount_percentage?: number;
}

// Type for creating a new plan
export interface CreatePlanInput {
  name: string;
  slug?: string;
  description?: string;
  max_users?: number;
  max_projects?: number;
  max_storage_gb?: number;
  features?: string[];
  trial_days?: number;
  is_featured?: boolean;
  is_active?: boolean;
  sort_order?: number;
  prices?: PlanPriceInput[];
}

export interface TenantListItem {
  uuid: string;
  name: string;
  slug: string;
  users_count: number;
  created_at: string;
  subscription: {
    uuid: string;
    status: string;
    is_courtesy: boolean;
    plan_name: string | null;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
}

export interface TenantDetail {
  uuid: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  onboarding_completed: boolean;
  users: {
    uuid: string;
    name: string;
    email: string;
    role: string;
  }[];
  subscriptions: {
    uuid: string;
    status: string;
    is_courtesy: boolean;
    courtesy_reason: string | null;
    courtesy_expires_at: string | null;
    plan: { uuid: string; name: string } | null;
    price: { interval: string; amount: number; formatted: string } | null;
    trial_ends_at: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    canceled_at: string | null;
    created_at: string;
  }[];
}

export interface SubscriptionListItem {
  uuid: string;
  tenant_name: string;
  tenant_uuid: string;
  status: string;
  is_courtesy: boolean;
  plan_name: string | null;
  created_at: string;
  current_period_end: string | null;
}

export interface Testimonial {
  id: number;
  uuid: string;
  author_name: string;
  author_role: string | null;
  author_company: string | null;
  author_avatar: string | null;
  quote: string;
  rating: number;
  sort_order: number;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: number;
  uuid: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  featured_image: string | null;
  category: string | null;
  tags: string[] | null;
  author_id: number | null;
  author: {
    id: number;
    name: string;
    email: string;
  } | null;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  sort_order: number;
  meta_title: string | null;
  meta_description: string | null;
  locale: string;
  views_count: number;
  reading_time?: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacyPolicy {
  id: number;
  uuid: string;
  type: 'privacy' | 'terms' | 'cookies' | 'refund' | 'disclaimer';
  title: string;
  slug: string;
  content: string | null;
  locale: string;
  status: 'draft' | 'published' | 'archived';
  meta_title: string | null;
  meta_description: string | null;
  version: string | null;
  sort_order: number;
  is_active: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export const POLICY_TYPES = {
  privacy: 'Política de Privacidade',
  terms: 'Termos de Uso',
  cookies: 'Política de Cookies',
  refund: 'Política de Reembolso',
  disclaimer: 'Aviso Legal',
} as const;

export function useAdminApi() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase;
  const adminStore = useAdminAuthStore();
  
  const loading = ref(false);
  const error = ref<any>(null);

  // Helper for auth headers
  const getAuthHeaders = () => {
    return {
      'Authorization': `Bearer ${adminStore.token}`,
      'Content-Type': 'application/json',
    };
  };

  // =========================================================================
  // AUTH
  // =========================================================================

  const login = async (email: string, password: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: { user: AdminUser; token: string } }>(`${baseURL}/admin/auth/login`, {
        method: 'POST',
        body: { email, password },
      });
      
      adminStore.setAuth(response.data.user, response.data.token);
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      await $fetch(`${baseURL}/admin/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      adminStore.logout();
    }
  };

  const fetchMe = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: AdminUser }>(`${baseURL}/admin/auth/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // DASHBOARD
  // =========================================================================

  const fetchDashboardStats = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: DashboardStats }>(`${baseURL}/admin/dashboard/stats`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchRecentActivity = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: any }>(`${baseURL}/admin/dashboard/activity`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // PLANS
  // =========================================================================

  const fetchPlans = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Plan[] }>(`${baseURL}/admin/plans`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPlan = async (data: CreatePlanInput) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Plan }>(`${baseURL}/admin/plans`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePlan = async (uuid: string, data: Partial<Plan>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Plan }>(`${baseURL}/admin/plans/${uuid}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deactivatePlan = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/plans/${uuid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const addPlanPrice = async (planUuid: string, data: Partial<PlanPrice>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: PlanPrice }>(`${baseURL}/admin/plans/${planUuid}/prices`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deactivatePlanPrice = async (priceUuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/plans/prices/${priceUuid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // TENANTS
  // =========================================================================

  const fetchTenants = async (params?: {
    search?: string;
    subscription_status?: string;
    is_courtesy?: boolean;
    page?: number;
    per_page?: number;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.subscription_status) query.append('subscription_status', params.subscription_status);
      if (params?.is_courtesy) query.append('is_courtesy', 'true');
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      
      const response = await $fetch<{ data: TenantListItem[]; meta: any }>(`${baseURL}/admin/tenants?${query}`, {
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

  const fetchTenant = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: TenantDetail }>(`${baseURL}/admin/tenants/${uuid}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // SUBSCRIPTIONS
  // =========================================================================

  const fetchSubscriptions = async (params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const query = new URLSearchParams();
      if (params?.status) query.append('status', params.status);
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      
      const response = await $fetch<{ data: SubscriptionListItem[]; meta: any }>(`${baseURL}/admin/subscriptions?${query}`, {
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

  // =========================================================================
  // COURTESIES
  // =========================================================================

  const fetchCourtesies = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: any[] }>(`${baseURL}/admin/courtesies`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const grantCourtesy = async (data: {
    tenant_uuid: string;
    plan_uuid: string;
    expires_at?: string;
    reason?: string;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: any }>(`${baseURL}/admin/courtesies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const revokeCourtesy = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/courtesies/${uuid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const extendCourtesy = async (uuid: string, expiresAt: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: any }>(`${baseURL}/admin/courtesies/${uuid}/extend`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { expires_at: expiresAt },
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateCourtesy = async (uuid: string, data: {
    plan_uuid?: string;
    expires_at?: string;
    reason?: string;
    indefinite?: boolean;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: any }>(`${baseURL}/admin/courtesies/${uuid}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // TESTIMONIALS
  // =========================================================================

  const fetchTestimonials = async (params?: {
    search?: string;
    is_active?: boolean;
    is_featured?: boolean;
    page?: number;
    per_page?: number;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
      if (params?.is_featured !== undefined) query.append('is_featured', String(params.is_featured));
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      
      const response = await $fetch<{ data: Testimonial[]; meta: any }>(`${baseURL}/admin/testimonials?${query}`, {
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

  const fetchTestimonial = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Testimonial }>(`${baseURL}/admin/testimonials/${uuid}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createTestimonial = async (data: Partial<Testimonial>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Testimonial }>(`${baseURL}/admin/testimonials`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateTestimonial = async (uuid: string, data: Partial<Testimonial>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: Testimonial }>(`${baseURL}/admin/testimonials/${uuid}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteTestimonial = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/testimonials/${uuid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reorderTestimonials = async (items: { uuid: string; sort_order: number }[]) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/testimonials/reorder`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { items },
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // BLOG POSTS
  // =========================================================================

  const fetchBlogPosts = async (params?: {
    search?: string;
    status?: string;
    category?: string;
    is_featured?: boolean;
    page?: number;
    per_page?: number;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status) query.append('status', params.status);
      if (params?.category) query.append('category', params.category);
      if (params?.is_featured !== undefined) query.append('is_featured', String(params.is_featured));
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      
      const response = await $fetch<{ data: BlogPost[]; meta: any }>(`${baseURL}/admin/blog?${query}`, {
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

  const fetchBlogPost = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: BlogPost }>(`${baseURL}/admin/blog/${uuid}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createBlogPost = async (data: Partial<BlogPost>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: BlogPost }>(`${baseURL}/admin/blog`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateBlogPost = async (uuid: string, data: Partial<BlogPost>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: BlogPost }>(`${baseURL}/admin/blog/${uuid}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deleteBlogPost = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/blog/${uuid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reorderBlogPosts = async (items: { uuid: string; sort_order: number }[]) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/blog/reorder`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { items },
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // PRIVACY POLICIES
  // =========================================================================

  const fetchPrivacyPolicies = async (params?: {
    search?: string;
    status?: string;
    type?: string;
    locale?: string;
    page?: number;
    per_page?: number;
  }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status) query.append('status', params.status);
      if (params?.type) query.append('type', params.type);
      if (params?.locale) query.append('locale', params.locale);
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      
      const response = await $fetch<{ data: PrivacyPolicy[]; meta: any }>(`${baseURL}/admin/privacy-policies?${query}`, {
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

  const fetchPrivacyPolicy = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: PrivacyPolicy }>(`${baseURL}/admin/privacy-policies/${uuid}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const createPrivacyPolicy = async (data: Partial<PrivacyPolicy>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: PrivacyPolicy }>(`${baseURL}/admin/privacy-policies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updatePrivacyPolicy = async (uuid: string, data: Partial<PrivacyPolicy>) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: PrivacyPolicy }>(`${baseURL}/admin/privacy-policies/${uuid}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: data,
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const deletePrivacyPolicy = async (uuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/privacy-policies/${uuid}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const reorderPrivacyPolicies = async (items: { uuid: string; sort_order: number }[]) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/privacy-policies/reorder`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: { items },
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // =========================================================================
  // IMPERSONATE
  // =========================================================================

  interface ImpersonateResponse {
    token: string;
    user: any;
    tenant: {
      uuid: string;
      name: string;
      slug: string;
    } | null;
    impersonated_by: {
      name: string;
      email: string;
    };
    log_uuid: string;
  }

  interface ImpersonateLogItem {
    uuid: string;
    admin: {
      name: string;
      email: string;
    };
    target_user: {
      name: string;
      email: string;
    };
    tenant: {
      name: string;
      slug: string;
    } | null;
    started_at: string;
    ended_at: string | null;
    ip_address: string | null;
    duration: string | null;
  }

  const impersonateUser = async (userUuid: string, tenantUuid?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ message: string; data: ImpersonateResponse }>(`${baseURL}/admin/impersonate/${userUuid}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: tenantUuid ? { tenant_uuid: tenantUuid } : {},
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchImpersonateLogs = async (params?: { page?: number; per_page?: number }) => {
    loading.value = true;
    error.value = null;
    
    try {
      const query = new URLSearchParams();
      if (params?.page) query.append('page', String(params.page));
      if (params?.per_page) query.append('per_page', String(params.per_page));
      
      const response = await $fetch<{ data: ImpersonateLogItem[]; meta: any }>(`${baseURL}/admin/impersonate/logs?${query}`, {
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

  const fetchActiveImpersonateSessions = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await $fetch<{ data: ImpersonateLogItem[] }>(`${baseURL}/admin/impersonate/active`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const endImpersonateSession = async (logUuid: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      await $fetch(`${baseURL}/admin/impersonate/${logUuid}/end`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    // Auth
    login,
    logout,
    fetchMe,
    // Dashboard
    fetchDashboardStats,
    fetchRecentActivity,
    // Plans
    fetchPlans,
    createPlan,
    updatePlan,
    deactivatePlan,
    addPlanPrice,
    deactivatePlanPrice,
    // Tenants
    fetchTenants,
    fetchTenant,
    // Subscriptions
    fetchSubscriptions,
    // Courtesies
    fetchCourtesies,
    grantCourtesy,
    updateCourtesy,
    revokeCourtesy,
    extendCourtesy,
    // Testimonials
    fetchTestimonials,
    fetchTestimonial,
    createTestimonial,
    updateTestimonial,
    deleteTestimonial,
    reorderTestimonials,
    // Blog Posts
    fetchBlogPosts,
    fetchBlogPost,
    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
    reorderBlogPosts,
    // Privacy Policies
    fetchPrivacyPolicies,
    fetchPrivacyPolicy,
    createPrivacyPolicy,
    updatePrivacyPolicy,
    deletePrivacyPolicy,
    reorderPrivacyPolicies,
    // Impersonate
    impersonateUser,
    fetchImpersonateLogs,
    fetchActiveImpersonateSessions,
    endImpersonateSession,
  };
}
