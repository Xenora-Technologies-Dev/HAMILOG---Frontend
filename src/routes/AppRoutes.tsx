import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { CustomerDetailPage } from '@/features/customers/CustomerDetailPage'
import { CustomerListPage } from '@/features/customers/CustomerListPage'
import { EnquiryBoardPage } from '@/features/enquiries/EnquiryBoardPage'
import { EnquiryDetailPage } from '@/features/enquiries/EnquiryDetailPage'
import { EnquiryListPage } from '@/features/enquiries/EnquiryListPage'
import { EnquiryNewPage } from '@/features/enquiries/EnquiryNewPage'
import { ReminderCalendarPage } from '@/features/reminders/ReminderCalendarPage'
import { ReminderDetailPage } from '@/features/reminders/ReminderDetailPage'
import { ReminderEditPage } from '@/features/reminders/ReminderEditPage'
import { ReminderListPage } from '@/features/reminders/ReminderListPage'
import { ReminderNewPage } from '@/features/reminders/ReminderNewPage'
import { StaffDetailPage } from '@/features/staff/StaffDetailPage'
import { StaffListPage } from '@/features/staff/StaffListPage'
import { AuditPage } from '@/features/audit/AuditPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { AppLayout } from '@/layouts/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WhatsAppLogPage } from '@/features/whatsapp/WhatsAppLogPage'
import { UnauthorizedPage } from '@/pages/UnauthorizedPage'
import { usePermissions } from '@/hooks/usePermissions'

function PermissionRoute({
  permission,
  anyOf,
  children,
}: {
  permission?: string
  anyOf?: string[]
  children: ReactNode
}) {
  const { hasPermission, hasAny } = usePermissions()
  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? hasAny(...anyOf)
      : true

  if (!allowed) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={
            <PermissionRoute permission="dashboard.view">
              <HomePage />
            </PermissionRoute>
          }
        />
        <Route
          path="enquiries"
          element={
            <PermissionRoute permission="enquiries.view">
              <EnquiryListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="enquiries/new"
          element={
            <PermissionRoute permission="enquiries.create">
              <EnquiryNewPage />
            </PermissionRoute>
          }
        />
        <Route
          path="enquiries/board"
          element={
            <PermissionRoute permission="enquiries.view">
              <EnquiryBoardPage />
            </PermissionRoute>
          }
        />
        <Route
          path="enquiries/:id"
          element={
            <PermissionRoute permission="enquiries.view">
              <EnquiryDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reminders"
          element={
            <PermissionRoute permission="reminders.view">
              <ReminderListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reminders/new"
          element={
            <PermissionRoute permission="reminders.create">
              <ReminderNewPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reminders/calendar"
          element={
            <PermissionRoute permission="reminders.view">
              <ReminderCalendarPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reminders/:id"
          element={
            <PermissionRoute permission="reminders.view">
              <ReminderDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reminders/:id/edit"
          element={
            <PermissionRoute permission="reminders.update">
              <ReminderEditPage />
            </PermissionRoute>
          }
        />
        <Route
          path="customers"
          element={
            <PermissionRoute permission="customers.view">
              <CustomerListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="customers/:id"
          element={
            <PermissionRoute permission="customers.view">
              <CustomerDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="staff"
          element={
            <PermissionRoute permission="users.view">
              <StaffListPage />
            </PermissionRoute>
          }
        />
        <Route
          path="staff/:id"
          element={
            <PermissionRoute permission="users.view">
              <StaffDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="reports"
          element={
            <PermissionRoute permission="reports.view">
              <ReportsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="audit"
          element={
            <PermissionRoute permission="audit.view">
              <AuditPage />
            </PermissionRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <PermissionRoute permission="dashboard.view">
              <NotificationsPage />
            </PermissionRoute>
          }
        />
        <Route
          path="whatsapp"
          element={
            <PermissionRoute permission="whatsapp.view">
              <WhatsAppLogPage />
            </PermissionRoute>
          }
        />
        <Route
          path="settings"
          element={
            <PermissionRoute permission="settings.view">
              <SettingsPage />
            </PermissionRoute>
          }
        />
        <Route path="unauthorized" element={<UnauthorizedPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
