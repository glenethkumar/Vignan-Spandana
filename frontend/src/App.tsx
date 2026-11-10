import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { StyleguidePage } from './pages/public/StyleguidePage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { WizardPage } from './pages/campaign/WizardPage';
import { LiveMonitorPage } from './pages/campaign/LiveMonitorPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { IssuesPage } from './pages/issues/IssuesPage';
import { UsersClassesPage } from './pages/admin/UsersClassesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { NotFoundPage } from './pages/error/NotFoundPage';
import { ForbiddenPage } from './pages/error/ForbiddenPage';
import { ToastProvider } from './components/common/Toast';
import { useAuth, AuthProvider } from './data/api';

const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Route guard for authenticated staff
const RequireAuth: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Website */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
            </Route>

            {/* Login Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<LoginPage />} />

            {/* Dev Styleguide (Only accessible in Demo Mode) */}
            {IS_DEMO_MODE && (
              <Route path="/dev/styleguide" element={<StyleguidePage />} />
            )}

            {/* Authenticated Application Workspace */}
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="/app/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />

              {/* Campaign Wizard */}
              <Route
                path="campaign/new"
                element={
                  <RequireAuth allowedRoles={['admin', 'principal', 'faculty']}>
                    <WizardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="new"
                element={
                  <RequireAuth allowedRoles={['admin', 'principal', 'faculty']}>
                    <WizardPage />
                  </RequireAuth>
                }
              />

              {/* Live Monitor */}
              <Route path="campaign/monitor/:id" element={<LiveMonitorPage />} />

              {/* Reports & History */}
              <Route
                path="reports"
                element={
                  <RequireAuth allowedRoles={['admin', 'principal', 'faculty']}>
                    <ReportsPage />
                  </RequireAuth>
                }
              />

              {/* Issues Board */}
              <Route
                path="issues"
                element={
                  <RequireAuth
                    allowedRoles={[
                      'admin',
                      'principal',
                      'college_coordinator',
                      'hostel_dean',
                      'bus_correspondent',
                    ]}
                  >
                    <IssuesPage />
                  </RequireAuth>
                }
              />

              {/* Admin Management Pages */}
              <Route
                path="users-classes"
                element={
                  <RequireAuth allowedRoles={['admin', 'principal']}>
                    <UsersClassesPage />
                  </RequireAuth>
                }
              />
              <Route
                path="settings"
                element={
                  <RequireAuth allowedRoles={['admin', 'principal']}>
                    <SettingsPage />
                  </RequireAuth>
                }
              />
            </Route>

            {/* Legacy URL Redirects with Login Guard */}
            <Route
              path="/attendance/daily"
              element={
                <RequireAuth>
                  <Navigate to="/app/reports" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/attendance/mark"
              element={
                <RequireAuth allowedRoles={['admin', 'principal', 'faculty']}>
                  <Navigate to="/app/campaign/new" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/attendance/queue"
              element={
                <RequireAuth>
                  <Navigate to="/app/dashboard" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/voice-assistant"
              element={
                <RequireAuth>
                  <Navigate to="/app/dashboard" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/assistant"
              element={
                <RequireAuth>
                  <Navigate to="/app/dashboard" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/telugu-speech-lab"
              element={
                <RequireAuth>
                  <Navigate to="/app/dashboard" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/follow-ups"
              element={
                <RequireAuth>
                  <Navigate to="/app/issues" replace />
                </RequireAuth>
              }
            />

            {/* Error Pages */}
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
