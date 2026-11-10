import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/common/Toast';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { WizardPage } from './pages/campaign/WizardPage';
import { LiveMonitorPage } from './pages/campaign/LiveMonitorPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { IssuesPage } from './pages/issues/IssuesPage';
import { UsersClassesPage } from './pages/admin/UsersClassesPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { ForbiddenPage } from './pages/error/ForbiddenPage';
import { NotFoundPage } from './pages/error/NotFoundPage';
import { getActiveUser } from './data/api';
import { User, UserRole } from './data/types';

// Protected Route Guard Component
const RoleGuard: React.FC<{
  allowedRoles: UserRole[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveUser().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-center text-xs text-ink-400">Verifying session...</div>;

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/app/forbidden" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Marketing Route */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
          </Route>

          {/* Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated Workspace Routes */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            
            <Route
              path="campaign/new"
              element={
                <RoleGuard allowedRoles={['admin', 'principal', 'faculty']}>
                  <WizardPage />
                </RoleGuard>
              }
            />
            <Route path="campaigns/new" element={<Navigate to="/app/campaign/new" replace />} />
            <Route path="campaigns" element={<Navigate to="/app/reports" replace />} />

            <Route
              path="campaign/:id/monitor"
              element={
                <RoleGuard allowedRoles={['admin', 'principal', 'faculty']}>
                  <LiveMonitorPage />
                </RoleGuard>
              }
            />

            <Route
              path="reports"
              element={
                <RoleGuard allowedRoles={['admin', 'principal', 'faculty']}>
                  <ReportsPage />
                </RoleGuard>
              }
            />

            <Route
              path="issues"
              element={
                <RoleGuard allowedRoles={['admin', 'principal', 'college_coordinator', 'hostel_dean', 'bus_correspondent']}>
                  <IssuesPage />
                </RoleGuard>
              }
            />

            <Route
              path="users-classes"
              element={
                <RoleGuard allowedRoles={['admin', 'principal']}>
                  <UsersClassesPage />
                </RoleGuard>
              }
            />
            <Route path="admin/users-classes" element={<Navigate to="/app/users-classes" replace />} />

            <Route
              path="settings"
              element={
                <RoleGuard allowedRoles={['admin', 'principal']}>
                  <SettingsPage />
                </RoleGuard>
              }
            />
            <Route path="admin/settings" element={<Navigate to="/app/settings" replace />} />

            <Route path="forbidden" element={<ForbiddenPage />} />
          </Route>

          {/* Fallback 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default App;

