<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAdminAuthStore } from '~/stores/adminAuthStore';

const router = useRouter()
const adminStore = useAdminAuthStore()
const { logout } = useAdminApi()

const open = ref(false)

const navigationItems: NavigationMenuItem[] = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/',
  },
  {
    label: 'Organizações',
    icon: 'i-lucide-building-2',
    to: '/tenants',
  },
  {
    label: 'Planos',
    icon: 'i-lucide-package',
    to: '/plans',
  },
  {
    label: 'Assinaturas',
    icon: 'i-lucide-credit-card',
    to: '/subscriptions',
  },
  {
    label: 'Cortesias',
    icon: 'i-lucide-gift',
    to: '/courtesies',
  },
  {
    label: 'Depoimentos',
    icon: 'i-lucide-message-square-quote',
    to: '/testimonials',
  },
  {
    label: 'Blog',
    icon: 'i-lucide-book-open',
    to: '/blog',
  },
]

const handleLogout = async () => {
  await logout()
  router.push('/login')
}

const userMenuItems = computed(() => [[
  {
    type: 'label' as const,
    label: adminStore.user?.name || 'Admin',
  }
], [
  {
    label: 'Sair',
    icon: 'i-lucide-log-out',
    onSelect: handleLogout,
  }
]])
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="admin"
      v-model:open="open"
      collapsible
      resizable
      class="bg-gray-900 dark:bg-gray-950"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-2 px-2 py-3">
          <UIcon name="i-lucide-shield-check" class="w-8 h-8 text-primary-500" />
          <span v-if="!collapsed" class="font-bold text-white text-lg">Admin</span>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="navigationItems"
          orientation="vertical"
          tooltip
          class="text-gray-300"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="border-t border-gray-700 pt-2">
          <UDropdownMenu
            :items="userMenuItems"
            :content="{ align: 'center', collisionPadding: 12 }"
          >
            <UButton
              :icon="collapsed ? 'i-lucide-user' : undefined"
              :label="collapsed ? undefined : adminStore.user?.name || 'Admin'"
              trailing-icon="i-lucide-chevron-up"
              color="neutral"
              variant="ghost"
              block
              :square="collapsed"
              class="text-gray-300 hover:text-white hover:bg-gray-800"
            />
          </UDropdownMenu>
        </div>
      </template>
    </UDashboardSidebar>

    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Top Bar -->
      <header class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center px-4">
        <div class="flex-1">
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            Painel Administrativo
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <UBadge color="warning" variant="subtle">
            Sistema Admin
          </UBadge>
        </div>
      </header>

      <!-- Main Content -->
      <main class="flex-1 p-6 bg-gray-50 dark:bg-gray-900 overflow-auto">
        <slot />
      </main>
    </div>
  </UDashboardGroup>
</template>
