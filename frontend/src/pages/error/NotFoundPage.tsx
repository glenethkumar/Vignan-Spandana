import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md bg-surface p-8 rounded-card border border-border shadow-float space-y-4">
        <div className="w-12 h-12 rounded-full bg-page text-ink-500 flex items-center justify-center mx-auto">
          <FileQuestion className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-ink-900">Page not found</h2>
          <p className="text-sm text-ink-500">
            The requested page does not exist or has been relocated to another section of the portal.
          </p>
        </div>
        <div className="pt-2">
          <Link to="/app">
            <Button variant="primary" size="md" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Workspace</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
