import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  AlertCircle,
  Users,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  HardDrive,
  UserCheck,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { User, UserRole } from '../data/types';
import { getActiveUser, setActiveUser, setDemoDataMode, getDemoDataMode, listIssues } from '../data/api';
import { Badge } from '../components/common/Badge';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [demoMode, setDemoMode] = useState<'demo' | 'empty'>('demo');
  const [hasOpenIssues, setHasOpenIssues] = useState(false);

  useEffect(() => {
    async function loadData() {
      const u = await getActiveUser();
      setUser(u);
      setDemoMode(getDemoDataMode());

      // Check open issues for orange badge
      const issues = await listIssues({ role: u.role });
      const open = issues.some(i => i.status !== 'closed');
      setHasOpenIssues(open);
    }
    loadData();
  }, [location.pathname]);

  const handleRoleChange = async (newRole: UserRole) => {
    let mockUser: User = {
      id: 1,
      username: 'admin',
      fullName: 'Dr. Ch. V. Rao',
      email: 'mdsohel46940@gmail.com',
      role: 'admin',
      department: 'CSE',
      isActive: true,
    };

    if (newRole === 'principal') {
      mockUser = {
        id: 2,
        username: 'principal',
        fullName: 'Dr. B. Arundhati',
        email: 'principal@viit.ac.in',
        role: 'principal',
        department: 'CSE',
        isActive: true,
      };
    } else if (newRole === 'faculty') {
      mockUser = {
        id: 3,
        username: 'faculty_cse',
        fullName: 'Prof. K. Ramesh',
        email: 'ramesh.k@viit.ac.in',
        role: 'faculty',
        department: 'CSE',
        isActive: true,
        assignedClasses: ['CSE / 3 / Section A', 'CSE / 3 / Section B', 'CSE / 3 / Section F'],
      };
    } else if (newRole === 'college_coordinator') {
      mockUser = {
        id: 5,
        username: 'coord_college',
        fullName: 'Dr. S. K. Murthy',
        email: 'murthy.sk@viit.ac.in',
        role: 'college_coordinator',
        department: 'CSE',
        isActive: true,
      };
    } else if (newRole === 'hostel_dean') {
      mockUser = {
        id: 6,
        username: 'dean_hostel',
        fullName: 'Mr. P. V. Ramana',
        email: 'hostel.dean@viit.ac.in',
        role: 'hostel_dean',
        department: 'CSE',
        isActive: true,
      };
    } else if (newRole === 'bus_correspondent') {
      mockUser = {
        id: 7,
        username: 'bus_corr',
        fullName: 'Mr. T. Naidu',
        email: 'transport@viit.ac.in',
        role: 'bus_correspondent',
        department: 'CSE',
        isActive: true,
      };
    }

    await setActiveUser(mockUser);
    setUser(mockUser);
    navigate('/app');
  };

  const handleDemoModeToggle = (mode: 'demo' | 'empty') => {
    setDemoDataMode(mode);
    setDemoMode(mode);
    window.location.reload();
  };

  const role = user?.role || 'admin';

  // Navigation Items per Role (Principal = full access like Admin)
  const navItems = [
    { label: 'Dashboard', path: '/app', icon: LayoutDashboard, roles: ['admin', 'principal', 'faculty', 'college_coordinator', 'hostel_dean', 'bus_correspondent'] },
    { label: 'New campaign', path: '/app/campaign/new', icon: PlusCircle, roles: ['admin', 'principal', 'faculty'], hasPlusBadge: true },
    { label: 'Reports & history', path: '/app/reports', icon: FileText, roles: ['admin', 'principal', 'faculty'] },
    { label: 'Issues', path: '/app/issues', icon: AlertCircle, roles: ['admin', 'principal', 'college_coordinator', 'hostel_dean', 'bus_correspondent'], hasAlert: hasOpenIssues },
    { label: 'Users & classes', path: '/app/users-classes', icon: Users, roles: ['admin', 'principal'] },
    { label: 'Settings', path: '/app/settings', icon: Settings, roles: ['admin', 'principal'] },
  ].filter(item => item.roles.includes(role));

  // Compute breadcrumb path
  const getBreadcrumbs = () => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return 'Dashboard';
    if (parts.includes('campaign')) return parts.includes('new') ? 'New campaign' : 'Live Monitor';
    if (parts.includes('reports')) return 'Reports & history';
    if (parts.includes('issues')) return 'Issues';
    if (parts.includes('users-classes')) return 'Users & classes';
    if (parts.includes('settings')) return 'Settings';
    return 'Workspace';
  };

  return (
    <div className="min-h-screen flex bg-page text-ink-900 font-sans">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (256px / w-64) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-dark flex items-center justify-center p-1.5 shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
                <rect x="3" y="8" width="2.5" height="8" rx="1.25" fill="currentColor" />
                <rect x="8.5" y="4" width="2.5" height="16" rx="1.25" fill="currentColor" />
                <rect x="14" y="9" width="2.5" height="10" rx="1.25" fill="currentColor" />
                <rect x="19.5" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-ink-900 leading-tight">VIIT AI Feedback</div>
              <div className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">Department of CSE</div>
            </div>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-ink-400 hover:text-ink-700 p-1 rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Eyebrow Label */}
        <div className="px-5 pt-5 pb-2 text-[10px] font-bold text-ink-400 uppercase tracking-[0.15em]">
          WORKSPACE
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/app' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand font-semibold shadow-xs'
                    : 'text-ink-600 hover:bg-page hover:text-ink-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'text-ink-400'}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.hasPlusBadge && (
                    <span className="w-4 h-4 rounded bg-page border border-border text-ink-500 text-[11px] flex items-center justify-center font-bold">
                      +
                    </span>
                  )}
                  {item.hasAlert && (
                    <span className="w-2 h-2 rounded-full bg-issue-icon ring-4 ring-issue-tint animate-pulse" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Storage status & footer links */}
        <div className="p-4 border-t border-border space-y-2.5 bg-surface">
          <div className="flex items-center gap-2 text-[11px] text-ink-600 px-2.5 py-1 rounded-full bg-page border border-border w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span>Saved on this device</span>
          </div>

          <div className="pt-2 border-t border-border/60 flex flex-col gap-1">
            <Link
              to="/"
              className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 rounded-md hover:bg-page transition-colors"
            >
              <span>Visit homepage</span>
              <span className="text-ink-400 font-mono text-xs">↗</span>
            </Link>

            <Link
              to="/login"
              className="flex items-center justify-between px-2 py-1.5 text-xs font-medium text-ink-600 hover:text-ink-900 rounded-md hover:bg-page transition-colors"
            >
              <span>Sign out</span>
              <span className="text-ink-400 font-mono text-xs">→</span>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-border h-16 flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-ink-500 hover:bg-page"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-ink-500">
              <span className="text-ink-400">Workspace</span>
              <span className="text-ink-300 font-mono text-xs">&gt;</span>
              <span className="text-ink-900 font-semibold">{getBreadcrumbs()}</span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Demo Data Switcher */}
            <div className="flex items-center bg-page rounded-lg p-0.5 border border-border text-xs">
              <button
                onClick={() => handleDemoModeToggle('empty')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  demoMode === 'empty' ? 'bg-surface text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-700'
                }`}
                title="Start empty state with 00 counters"
              >
                Start empty
              </button>
              <button
                onClick={() => handleDemoModeToggle('demo')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  demoMode === 'demo' ? 'bg-surface text-ink-900 shadow-xs' : 'text-ink-500 hover:text-ink-700'
                }`}
                title="Load full demo data"
              >
                Load demo
              </button>
            </div>

            {/* User Profile Block & Role Switcher */}
            <div className="relative group flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-page border border-border flex items-center justify-center font-bold text-xs text-ink-800">
                {user?.fullName ? user.fullName[0] : 'M'}
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <div className="font-semibold text-ink-900 capitalize">
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'principal' ? 'Principal' : user?.fullName}
                </div>
                <div className="text-[11px] text-ink-400">{user?.email || 'mdsohel46940@gmail.com'}</div>
              </div>

              {/* Role Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface rounded-card border border-border shadow-float p-1.5 hidden group-hover:block z-50">
                <div className="px-2 py-1 text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                  Switch Active Role
                </div>
                {[
                  { r: 'admin', label: 'Administrator' },
                  { r: 'principal', label: 'Principal (Full Access)' },
                  { r: 'faculty', label: 'Faculty (CSE)' },
                  { r: 'college_coordinator', label: 'College Coordinator' },
                  { r: 'hostel_dean', label: 'Hostel Dean' },
                  { r: 'bus_correspondent', label: 'Bus Correspondent' },
                ].map(opt => (
                  <button
                    key={opt.r}
                    onClick={() => handleRoleChange(opt.r as UserRole)}
                    className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md transition-colors ${
                      user?.role === opt.r ? 'bg-brand-50 text-brand font-semibold' : 'text-ink-700 hover:bg-page'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
