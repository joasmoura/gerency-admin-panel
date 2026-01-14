// Admin Support Types
export interface AdminSupportTicket {
  id: number
  uuid: string
  ticket_number: string
  subject: string
  description: string
  category: 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'account' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  user: {
    id: number
    name: string
    email: string
    avatar_url: string | null
  }
  tenant: {
    id: number
    name: string
    uuid: string
  }
  assigned_to?: {
    id: number
    name: string
    email: string
    avatar_url: string | null
  } | null
  messages: AdminSupportMessage[]
  latest_message?: AdminSupportMessage | null
}

export interface AdminSupportMessage {
  id: number
  uuid: string
  message: string
  is_internal_note: boolean
  is_from_admin: boolean
  attachments: string[] | null
  read_at: string | null
  created_at: string
  user: {
    id: number
    name: string
    email: string
    avatar_url: string | null
    is_admin?: boolean
  }
}

export interface AdminSupportDashboard {
  overview: {
    total_tickets: number
    open_tickets: number
    resolved_today: number
    unassigned: number
    pending_response: number
  }
  by_status: Record<string, number>
  by_category: Record<string, number>
  by_priority: Record<string, number>
  trends: {
    new_tickets: Record<string, number>
    resolved: Record<string, number>
  }
  performance: {
    avg_response_time_minutes: number
    avg_resolution_time_hours: number
  }
  top_agents: Array<{
    assigned_to: number
    resolved_count: number
    assigned_to_user?: {
      id: number
      name: string
      email: string
      avatar_url: string | null
    }
  }>
  urgent_tickets: AdminSupportTicket[]
}
