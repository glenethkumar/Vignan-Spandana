import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  PlusCircle,
  BarChart3,
  AlertCircle,
  Users,
  Settings,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { BrandMark } from '../components/common/BrandMark';
import { useAuth } from '../data/api';
import { useIssues } from '../data/api';

export const AppLayout: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { openIssuesCount } = useIssues();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const role = currentUser?.role || 'admin';
  const isAdminOrPrincipal = role === 'admin' || role === 'principal';
  const isFaculty = role === 'faculty';
  const isIssueOwner =
    role === 'college_coordinator' ||
    role === 'hostel_dean' ||
    role === 'bus_correspondent';

  // Navigation Items according to strict role permissions
  const navItems = [
    {
      to: '/app/dashboard',
      label: 'Dashboard',
      icon: <LayoutGrid className="w-4 h-4 shrink-0" />,
      visible: true,
    },
    {
      to: '/app/campaign/new',
      label: 'New campaign',
      icon: <PlusCircle className="w-4 h-4 shrink-0" />,
      visible: isAdminOrPrincipal || isFaculty,
      badge: '+',
    },
    {
      to: '/app/reports',
      label: 'Reports & history',
      icon: <BarChart3 className="w-4 h-4 shrink-0" />,
      visible: isAdminOrPrincipal || isFaculty,
    },
    {
      to: '/app/issues',
      label: 'Issues',
      icon: <AlertCircle className="w-4 h-4 shrink-0" />,
      visible: isAdminOrPrincipal || isIssueOwner,
      hasDot: openIssuesCount > 0,
    },
    {
      to: '/app/users-classes',
      label: 'Users & classes',
      icon: <Users className="w-4 h-4 shrink-0" />,
      visible: isAdminOrPrincipal,
    },
    {
      to: '/app/settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4 shrink-0" />,
      visible: isAdminOrPrincipal,
    },
  ];

  // Derive breadcrumb from current path
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Dashboard';
    if (path.includes('/campaign/new') || path.includes('/new')) return 'New campaign';
    if (path.includes('/campaign/monitor')) return 'Live monitor';
    if (path.includes('/reports')) return 'Reports & history';
    if (path.includes('/issues')) return 'Issues';
    if (path.includes('/users-classes')) return 'Users & classes';
    if (path.includes('/settings')) return 'Settings';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-page flex font-sans selection:bg-brand-50 selection:text-brand text-left">
      {/* 256px White Sidebar */}
      <aside className="w-[256px] bg-white border-r border-hairline flex flex-col justify-between shrink-0 sticky top-0 h-screen z-30">
        <div>
          {/* Top Brand Mark */}
          <div className="p-6 pb-5 border-b border-hairline/60">
            <BrandMark size="sm" />
          </div>

          {/* Nav Items */}
          <div className="px-3 pt-5">
            <span className="px-3 text-[11px] font-bold tracking-eyebrow uppercase text-muted/70 block mb-2 select-none">
              Workspace
            </span>

            <nav className="flex flex-col gap-1">
              {navItems
                .filter((item) => item.visible)
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `h-12 px-3.5 rounded-input flex items-center justify-between text-sm transition-all duration-150 select-none ${
                        isActive
                          ? 'bg-brand-50 text-brand-dark font-bold'
                          : 'text-text-main hover:bg-[#F5F6F8] font-medium'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <span className={isActive ? 'text-brand' : 'text-muted'}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {item.badge && isActive && (
                            <span className="w-5 h-5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                          {item.hasDot && (
                            <span className="w-2 h-2 rounded-full bg-issue-icon" />
                          )}
                        </div>
                      </>
                    )}
                  </NavLink>
                ))}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-hairline flex flex-col gap-2">
          {/* Saved on this device pill */}
          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-[#F5F6F8] text-[11px] font-semibold text-muted select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Saved on this device</span>
          </div>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-input text-xs font-semibold text-muted hover:text-ink hover:bg-[#F5F6F8] transition-colors"
          >
            <span>Visit homepage</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center justify-between px-3 py-2 rounded-input text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <span>Sign out</span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 86px White Top Bar */}
        <header className="h-[86px] bg-white border-b border-hairline px-8 sm:px-12 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="font-normal text-muted/70">Workspace</span>
            <span className="text-muted/40 font-bold">›</span>
            <span className="font-semibold text-ink">{getBreadcrumb()}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-200 text-ink font-bold flex items-center justify-center text-sm shadow-xs select-none">
              {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-ink leading-tight">
                {currentUser?.fullName || currentUser?.username || 'Staff User'}
              </span>
              <span className="text-xs text-muted leading-tight">
                {currentUser?.email || 'staff@viit.ac.in'}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 px-8 sm:px-12 py-8 min-h-[calc(100vh-86px-48px)]">
          <Outlet />
        </main>

        {/* App Footer */}
        <footer className="h-12 border-t border-hairline px-8 sm:px-12 flex items-center justify-between text-xs text-muted bg-white select-none">
          <span>VIIT AI Feedback</span>
          <span>Department of CSE</span>
        </footer>
      </div>
    </div>
  );
};
