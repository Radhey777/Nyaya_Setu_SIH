import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { AppLayout } from './components/layout/AppLayout'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const SignupPage = lazy(() => import('./pages/auth/SignupPage'))
const AccessDeniedPage = lazy(() => import('./pages/auth/AccessDeniedPage'))
const NotFoundPage = lazy(() => import('./pages/auth/NotFoundPage'))
const HelpPage = lazy(() => import('./pages/help/HelpPage'))

const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'))
const InstitutionListPage = lazy(() => import('./pages/institutions/InstitutionListPage'))
const InstitutionDetailPage = lazy(() => import('./pages/institutions/InstitutionDetailPage'))
const CaseListPage = lazy(() => import('./pages/cases/CaseListPage'))
const CreateCasePage = lazy(() => import('./pages/cases/CreateCasePage'))
const CaseDetailPage = lazy(() => import('./pages/cases/CaseDetailPage'))
const RelationshipInboxPage = lazy(() => import('./pages/cases/RelationshipInboxPage'))
const CoordinationListPage = lazy(() => import('./pages/coordination/CoordinationListPage'))
const CreateCoordinationPage = lazy(() => import('./pages/coordination/CreateCoordinationPage'))
const CoordinationDetailPage = lazy(() => import('./pages/coordination/CoordinationDetailPage'))
const NotificationsPage = lazy(() => import('./pages/notifications/NotificationsPage'))
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'))
const ImportsPage = lazy(() => import('./pages/imports/ImportsPage'))
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))

// ─── Loading fallback ─────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    </div>
  )
}

// ─── Route guard ──────────────────────────────────────────────────────────────

interface ProtectedRouteProps {
  /** Optional role whitelist. If provided and the user's role is not in the
   *  list, the user is redirected to /403. */
  roles?: string[]
}

function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  // While the session is being restored from a stored token, avoid a flash of
  // the login redirect on authenticated refreshes.
  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/403" element={<AccessDeniedPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/help" element={<HelpPage />} />

            {/* Protected routes (auth + layout) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/institutions" element={<InstitutionListPage />} />
                <Route path="/institutions/:id" element={<InstitutionDetailPage />} />
                <Route path="/cases" element={<CaseListPage />} />
                <Route path="/cases/new" element={<CreateCasePage />} />
                <Route path="/cases/:id" element={<CaseDetailPage />} />
                <Route path="/relationships" element={<RelationshipInboxPage />} />
                <Route path="/coordination" element={<CoordinationListPage />} />
                <Route path="/coordination/new" element={<CreateCoordinationPage />} />
                <Route path="/coordination/:id" element={<CoordinationDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Role-restricted routes */}
                <Route element={<ProtectedRoute roles={['data_admin', 'system_admin']} />}>
                  <Route path="/imports" element={<ImportsPage />} />
                </Route>
                <Route element={<ProtectedRoute roles={['system_admin']} />}>
                  <Route path="/admin/users" element={<UserManagementPage />} />
                </Route>
                <Route
                  element={<ProtectedRoute roles={['system_admin', 'senior_management']} />}
                >
                  <Route path="/admin/audit" element={<AuditLogPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
