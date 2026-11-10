import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center p-6 text-center">
      <span className="text-xs font-bold tracking-eyebrow uppercase text-brand">
        404 Notice
      </span>
      <h1 className="font-display text-5xl font-bold text-ink mt-2">
        Page not found.
      </h1>
      <p className="mt-3 text-sm text-muted max-w-sm">
        The requested screen or record does not exist or has been archived.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button icon={<ArrowLeft className="w-4 h-4" />} iconPosition="left">
            Return to homepage
          </Button>
        </Link>
      </div>
    </div>
  );
};

