import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ProcessOverlay } from '@/components/ui/ProcessOverlay'
import { AuthProvider } from '@/features/auth/AuthContext'
import { AppRoutes } from '@/routes/AppRoutes'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <ProcessOverlay />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
