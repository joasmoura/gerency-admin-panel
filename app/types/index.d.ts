import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'
export type CustomerStatus = 'active' | 'inactive' | 'blocked'
export type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export interface Tenant {
  id: number
  uuid: string
  name: string
  cpfcnpj?: string
  logo?: string
  owner_id: number
  segment?: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: number
  uuid?: string
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
  tenants?: Tenant[]
}

export interface Customer {
  id: number
  uuid: string
  name: string
  email?: string
  phone?: string
  document?: string
  company?: string
  avatar?: string
  status: CustomerStatus
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CustomerPagination {
  data: Customer[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Project {
  id: number
  uuid: string
  name: string
  description?: string
  customer_id?: number
  customer?: {
    id: number
    uuid: string
    name: string
  }
  responsible_id?: number
  responsible?: {
    id: number
    uuid: string
    name: string
  }
  status: ProjectStatus
  start_date?: string
  due_date?: string
  deadline_days?: number
  budget?: number
  hourly_rate?: number
  estimated_hours?: number
  progress: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface ProjectPagination {
  data: Project[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface Notification {
  id: number
  unread?: boolean
  sender: User
  body: string
  date: string
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface TaskStatus {
  id: number
  uuid: string
  name: string
  color: string
  order: number
  is_default: boolean
  is_completed: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskStatusPagination {
  data: TaskStatus[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface TaskPriority {
  id: number
  uuid: string
  name: string
  color: string
  icon?: string
  level: number
  order: number
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskPriorityPagination {
  data: TaskPriority[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface TaskType {
  id: number
  uuid: string
  name: string
  color: string
  icon?: string
  order: number
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TaskTypePagination {
  data: TaskType[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Milestone {
  id: number
  uuid: string
  project_id: number
  project?: {
    id: number
    uuid: string
    name: string
  }
  name: string
  description?: string
  start_date?: string
  due_date?: string
  completed_at?: string
  order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MilestonePagination {
  data: Milestone[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

// Sprints
export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled'

export interface Sprint {
  id: number
  uuid: string
  name: string
  description?: string
  goal?: string
  start_date?: string
  end_date?: string
  completed_at?: string
  status: SprintStatus
  order: number
  is_active: boolean
  tasks_count?: number
  completed_tasks_count?: number
  tasks?: Task[]
  stats?: SprintStats
  created_at: string
  updated_at: string
}

export interface SprintStats {
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  blocked_tasks: number
  total_estimated_hours: number
  total_worked_hours: number
  tasks_by_status: Record<number, number>
  tasks_by_priority: Record<number, number>
}

export interface SprintPagination {
  data: Sprint[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Task {
  id: number
  uuid: string
  code: number
  title: string
  description?: string
  project_id?: number
  project?: {
    id: number
    uuid: string
    name: string
  }
  milestone_id?: number
  milestone?: {
    id: number
    uuid: string
    name: string
  }
  sprint_id?: number
  sprint?: {
    id: number
    uuid: string
    name: string
    status: SprintStatus
  }
  status_id?: number
  status?: TaskStatus
  priority_id?: number
  priority?: TaskPriority
  type_id?: number
  type?: TaskType
  responsible_id?: number
  responsible?: {
    id: number
    uuid: string
    name: string
  }
  created_by?: number
  creator?: {
    id: number
    uuid: string
    name: string
  }
  due_date?: string
  completed_at?: string
  estimated_hours: number
  estimated_minutes: number
  worked_hours: number
  worked_minutes: number
  value: number
  is_blocked: boolean
  block_reason?: string
  blockers?: TaskBlocker[]
  blocking?: TaskBlocker[]
  checklists?: TaskChecklist[]
  order: number
  created_at: string
  updated_at: string
}

export interface TaskBlocker {
  uuid: string
  code: number
  title: string
  status?: TaskStatus
  is_completed: boolean
  pivot_uuid?: string
}

export interface TaskPagination {
  data: Task[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface TaskCommentReaction {
  emoji: string
  count: number
  users: number[]
}

export interface TaskComment {
  id: number
  uuid: string
  task_id: number
  user_id: number
  parent_id?: number
  user?: {
    id: number
    uuid: string
    name: string
    email: string
  }
  content: string
  replies?: TaskComment[]
  grouped_reactions?: TaskCommentReaction[]
  created_at: string
  updated_at: string
}

export interface TaskChecklist {
  id: number
  uuid: string
  task_id: number
  title: string
  is_completed: boolean
  completed_at?: string
  completed_by?: number
  completedByUser?: {
    id: number
    uuid: string
    name: string
  }
  blocking_task_id?: number
  blocking_task?: {
    id: number
    uuid: string
    title: string
    status_id: number
    status?: {
      id: number
      uuid: string
      name: string
      is_completed: boolean
      color: string
    }
  }
  is_blocking_task_completed?: boolean
  order: number
  created_at: string
  updated_at: string
}

// Fixed Expenses (Despesas Fixas)
export type ExpenseCategory = 'utilities' | 'rent' | 'internet' | 'software' | 'insurance' | 'taxes' | 'payroll' | 'marketing' | 'maintenance' | 'office' | 'transport' | 'equipment' | 'other'
export type IncomeCategory = 'service' | 'product' | 'project' | 'consulting' | 'subscription' | 'commission' | 'refund' | 'investment' | 'other'
export type InvoiceType = 'income' | 'expense'
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface FixedExpense {
  id: number
  uuid: string
  name: string
  description?: string
  amount: number
  due_day: number
  category?: ExpenseCategory
  is_active: boolean
  start_date?: string
  end_date?: string
  invoices?: Invoice[]
  created_at: string
  updated_at: string
}

export interface FixedExpensePagination {
  data: FixedExpense[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface Invoice {
  id: number
  uuid: string
  type: InvoiceType
  fixed_expense_id?: string
  fixed_expense?: {
    id: number
    uuid: string
    name: string
  }
  project_id?: string
  project?: {
    id: number
    uuid: string
    name: string
  }
  customer_id?: string
  customer?: {
    id: number
    uuid: string
    name: string
  }
  name: string
  description?: string
  amount: number
  due_date: string
  paid_date?: string
  category: string
  status: InvoiceStatus
  payment_method?: string
  invoice_number?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface InvoicePagination {
  data: Invoice[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface InvoiceStats {
  month: string
  income: {
    total: number
    paid: number
    pending: number
    overdue: number
    paid_count: number
    pending_count: number
    overdue_count: number
  }
  expense: {
    total: number
    paid: number
    pending: number
    overdue: number
    paid_count: number
    pending_count: number
    overdue_count: number
  }
  balance: number
  projected_balance: number
}

// Task Activities (Histórico/Timeline)
export type TaskActivityAction = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'assigned'
  | 'unassigned'
  | 'commented'
  | 'comment_edited'
  | 'comment_deleted'
  | 'mentioned'
  | 'checklist_added'
  | 'checklist_completed'
  | 'checklist_uncompleted'
  | 'checklist_deleted'
  | 'blocker_added'
  | 'blocker_removed'
  | 'priority_changed'
  | 'type_changed'
  | 'due_date_changed'
  | 'project_changed'
  | 'milestone_changed'
  | 'blocked'
  | 'unblocked'
  | 'completed'
  | 'reopened'

export interface TaskActivity {
  id: number
  uuid: string
  task_id: number
  user_id?: number
  action: TaskActivityAction
  field?: string
  old_value?: string
  new_value?: string
  metadata?: Record<string, any>
  description?: string
  user?: {
    id: number
    uuid: string
    name: string
    email: string
  }
  task?: {
    id: number
    uuid: string
    code: number
    title: string
  }
  created_at: string
  updated_at: string
}

export interface TaskActivityPagination {
  data: TaskActivity[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface TaskActivityStats {
  total_activities: number
  comments_count: number
  status_changes: number
  mentions_count: number
  checklist_completed: number
  contributors: number
  last_activity?: {
    created_at: string
    action: TaskActivityAction
    user_id?: number
  }
}
