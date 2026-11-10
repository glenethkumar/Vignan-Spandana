import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center p-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <span className="text-xs font-bold tracking-eyebrow uppercase text-red-600">
        403 Access Restricted
      </span>
      <h1 className="font-display text-4xl font-bold text-ink mt-2">
        Restricted to authorized roles.
      </h1>
      <p className="mt-3 text-sm text-muted max-w-sm">
        Your staff credentials do not have permission to view or manage records in this department or category.
      </p>
      <div className="mt-6">
        <Link to="/app/dashboard">
          <Button icon={<ArrowLeft className="w-4 h-4" />} iconPosition="left">
            Return to your workspace
          </Button>
        </Link>
      </div>
    </div>
  );
};

