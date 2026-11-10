import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { ShieldCheck, ArrowRight } from 'lucide-react';

export const PublicLayout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-page">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/viit-logo.png"
              alt="VIIT Emblem"
              className="w-10 h-10 object-contain rounded-full shadow-sm"
            />
            <div>
              <div className="text-base font-bold text-ink-900 leading-tight group-hover:text-brand transition-colors">
                VIIT AI Feedback
              </div>
              <div className="text-xs font-medium text-ink-500 uppercase tracking-wider">
                Department of CSE
              </div>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                location.pathname === '/' ? 'text-brand font-semibold' : 'text-ink-600 hover:text-ink-900'
              }`}
            >
              Home
            </Link>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors"
            >
              How it works
            </a>
            <a
              href="#issue-resolution"
              className="text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors"
            >
              Issue resolution
            </a>
          </nav>

          {/* Portal CTA */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button size="sm" variant="primary" className="gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Admin portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Institutional Footer */}
      <footer className="bg-surface border-t border-border py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/viit-logo.png" alt="VIIT Emblem" className="w-8 h-8 object-contain rounded-full" />
            <div>
              <p className="text-sm font-semibold text-ink-900">VIIT AI Feedback Portal</p>
              <p className="text-xs text-ink-500">Vignan's Institute of Information Technology (Autonomous), Visakhapatnam</p>
            </div>
          </div>
          <div className="text-xs text-ink-500 text-center md:text-right">
            <p>Authorized college deployment. All parent contact numbers strictly protected.</p>
            <p className="mt-1">© {new Date().getFullYear()} Department of CSE · Autonomous Campus System</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
