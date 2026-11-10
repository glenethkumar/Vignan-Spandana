import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { BrandMark } from '../components/common/BrandMark';
import { Button } from '../components/common/Button';

export const PublicLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      return;
    }
    const elem = document.getElementById(id);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-page flex flex-col font-sans selection:bg-brand-50 selection:text-brand">
      {/* 100px Centered Header */}
      <header className="w-full h-[100px] flex items-center justify-center border-b border-hairline/60 bg-page/90 backdrop-blur-md sticky top-0 z-40">
        <div className="w-full max-w-[1222px] px-6 flex items-center justify-between">
          {/* Brand Mark Left */}
          <Link to="/" className="no-underline">
            <BrandMark size="md" />
          </Link>

          {/* Center Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <Link
              to="/"
              className="text-ink font-semibold hover:text-neutral-900 transition-colors"
            >
              Home
            </Link>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-muted font-medium hover:text-ink transition-colors cursor-pointer"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('issue-resolution')}
              className="text-muted font-medium hover:text-ink transition-colors cursor-pointer"
            >
              Issue resolution
            </button>
          </nav>

          {/* Right Action: Admin Portal Black Pill */}
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button
                size="sm"
                className="h-10 px-5 text-sm font-semibold rounded-btn"
              >
                Admin portal ↗
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1 flex flex-col items-center">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-hairline bg-white py-12 flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-[1222px] px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <BrandMark size="sm" showSubtitle={false} />
            <span className="text-sm text-muted font-medium">
              Better conversations. Better campus.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 text-xs text-muted font-medium">
              <img
                src="/viit-logo.png"
                alt="VIIT Emblem"
                className="w-5 h-5 object-contain opacity-80"
              />
              <span>Vignan's Institute of Information Technology</span>
            </div>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs">
                Admin portal ↗
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
