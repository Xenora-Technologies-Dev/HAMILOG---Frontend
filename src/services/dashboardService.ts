import { apiGet } from '@/services/apiClient'

export type DashboardOverview = {
  timezone: string
  generatedAt: string
  dubaiNow: string
  kpis: {
    remindersToday: number
    remindersOverdue: number
    remindersUpcoming: number
    openEnquiries: number
    newEnquiries: number
    overdueEnquiries: number
    completedEnquiries: number
  }
  permissions: {
    canViewReminders: boolean
    canViewEnquiries: boolean
    canViewUsers: boolean
  }
  todaysReminders: Array<{
    id: string
    title: string
    personName: string | null
    referenceCode: string | null
    eventDate: string
    priority: string
    status: string
    categoryName: string
    assignedTo: string | null
    bucket: 'overdue' | 'today' | 'upcoming'
    whatsappStatus: string | null
    whatsappLabel: string | null
  }>
  enquiryPipeline: Array<{ code: string; name: string; count: number }>
  staffWorkload: Array<{
    staffId: string
    staffName: string
    openEnquiries: number
    overdueEnquiries?: number
    todaysReminders: number
    overdueReminders: number
  }>
  recentActivity: Array<{
    id: string
    action: string
    entityType: string
    entityId: string | null
    createdAt: string
    actorName: string
    summary?: string | null
    enquiryNumber?: string
    metadata: unknown
  }>
}

export function getDashboardOverview() {
  return apiGet<{ data: DashboardOverview }>('/dashboard')
}
